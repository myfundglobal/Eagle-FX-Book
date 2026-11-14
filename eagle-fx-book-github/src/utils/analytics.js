import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  subDays,
  subMonths,
  format,
  parseISO
} from "date-fns";

export function parseTradeDate(trade) {
  if (!trade?.date) return new Date();
  const parsed = parseISO(trade.date);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function computeDashboardStats(trades, equityRange = "ALL") {
  const sortedAsc = [...trades].sort(
    (a, b) => parseTradeDate(a).getTime() - parseTradeDate(b).getTime()
  );

  const totalTrades = sortedAsc.length;
  const wins = sortedAsc.filter((t) => (Number(t.pnl) || 0) > 0);
  const losses = sortedAsc.filter((t) => (Number(t.pnl) || 0) < 0);

  const netPnl = sortedAsc.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const grossProfit = wins.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (Number(t.pnl) || 0), 0));

  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 9.99 : 0;

  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const avgRR =
    avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 2.5 : 0;

  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).getTime();

  const todayPnl = sortedAsc
    .filter((t) => {
      const ts = parseTradeDate(t).getTime();
      return ts >= todayStart && ts <= todayEnd;
    })
    .reduce((s, t) => s + (Number(t.pnl) || 0), 0);

  const weekPnl = sortedAsc
    .filter((t) => {
      const ts = parseTradeDate(t).getTime();
      return ts >= weekStart && ts <= weekEnd;
    })
    .reduce((s, t) => s + (Number(t.pnl) || 0), 0);

  const bestTrade =
    totalTrades > 0 ? Math.max(...sortedAsc.map((t) => Number(t.pnl) || 0)) : 0;
  const worstTrade =
    totalTrades > 0 ? Math.min(...sortedAsc.map((t) => Number(t.pnl) || 0)) : 0;

  let peak = 0;
  let running = 0;
  let maxDrawdown = 0;
  sortedAsc.forEach((t) => {
    running += Number(t.pnl) || 0;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  const rTrades = sortedAsc.filter((t) => {
    const val = Number(t.riskReward ?? t.rMultiple);
    return val !== 0 && !Number.isNaN(val);
  });
  const expectancyR =
    rTrades.length > 0
      ? rTrades.reduce((s, t) => s + Number(t.riskReward ?? t.rMultiple), 0) / rTrades.length
      : totalTrades > 0 && avgLoss > 0
        ? (winRate / 100) * avgRR - (1 - winRate / 100)
        : 0;

  let cutoff = 0;
  if (equityRange === "1W") cutoff = subDays(now, 7).getTime();
  else if (equityRange === "1M") cutoff = subMonths(now, 1).getTime();
  else if (equityRange === "3M") cutoff = subMonths(now, 3).getTime();

  const rangedTrades =
    cutoff > 0
      ? sortedAsc.filter((t) => parseTradeDate(t).getTime() >= cutoff)
      : sortedAsc;

  let cumulative = 0;
  const equityCurve = rangedTrades.map((t, index) => {
    cumulative += Number(t.pnl) || 0;
    return {
      label: format(parseTradeDate(t), "MMM d"),
      equity: Number(cumulative.toFixed(2)),
      index: index + 1
    };
  });

  return {
    totalTrades,
    winsCount: wins.length,
    lossesCount: losses.length,
    netPnl,
    profitFactor,
    winRate,
    avgWin,
    avgLoss,
    avgRR,
    todayPnl,
    weekPnl,
    bestTrade,
    worstTrade,
    maxDrawdown,
    expectancyR,
    equityCurve
  };
}

export function computeMonthlyJournalData(trades, monthDate) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const monthTrades = trades.filter((t) => isSameMonth(parseTradeDate(t), monthDate));

  const dailyMap = new Map();
  monthTrades.forEach((t) => {
    const key = format(parseTradeDate(t), "yyyy-MM-dd");
    const existing = dailyMap.get(key) || { dateKey: key, pnl: 0, trades: [] };
    existing.pnl += Number(t.pnl) || 0;
    existing.trades.push(t);
    dailyMap.set(key, existing);
  });

  const calendarCells = eachDayOfInterval({ start: gridStart, end: gridEnd }).map(
    (day) => {
      const key = format(day, "yyyy-MM-dd");
      const entry = dailyMap.get(key);
      return {
        date: day,
        dateKey: key,
        inCurrentMonth: isSameMonth(day, monthDate),
        isToday: isSameDay(day, new Date()),
        pnl: entry ? entry.pnl : 0,
        trades: entry ? entry.trades : []
      };
    }
  );

  const monthlyPnl = monthTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const wins = monthTrades.filter((t) => (Number(t.pnl) || 0) > 0).length;
  const losses = monthTrades.filter((t) => (Number(t.pnl) || 0) < 0).length;
  const winRate =
    monthTrades.length > 0 ? Math.round((wins / monthTrades.length) * 100) : 0;

  const tradingDaysList = Array.from(dailyMap.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );
  const profitableDays = tradingDaysList.filter((d) => d.pnl > 0).length;

  let streakCount = 0;
  let streakType = "W";
  if (tradingDaysList.length > 0) {
    const lastDayWin = tradingDaysList[tradingDaysList.length - 1].pnl >= 0;
    streakType = lastDayWin ? "W" : "L";
    for (let i = tradingDaysList.length - 1; i >= 0; i--) {
      const isWin = tradingDaysList[i].pnl >= 0;
      if (isWin === lastDayWin) streakCount++;
      else break;
    }
  }

  // Weekly breakdown
  const weeks = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    const slice = calendarCells.slice(i, i + 7);
    const inMonthDays = slice.filter((c) => c.inCurrentMonth);
    if (inMonthDays.length === 0) continue;
    const weekTrades = inMonthDays.flatMap((c) => c.trades);
    const weekWins = weekTrades.filter((t) => (Number(t.pnl) || 0) > 0).length;
    const weekPnl = weekTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const weekWinRate =
      weekTrades.length > 0 ? Math.round((weekWins / weekTrades.length) * 100) : 0;
    weeks.push({
      weekIndex: weeks.length + 1,
      rangeLabel: `${format(inMonthDays[0].date, "MMM d")} – ${format(
        inMonthDays[inMonthDays.length - 1].date,
        "MMM d"
      )}`,
      tradesCount: weekTrades.length,
      winRate: weekWinRate,
      pnl: weekPnl
    });
  }

  return {
    monthTrades,
    calendarCells,
    dailyMap,
    monthlyPnl,
    wins,
    losses,
    winRate,
    tradingDaysCount: tradingDaysList.length,
    profitableDays,
    streakLabel: tradingDaysList.length > 0 ? `${streakCount} ${streakType}` : "0 W",
    streakIsWin: streakType === "W",
    weeks
  };
}
