package com.example.util

data class CountryPhoneRule(
    val isoCode: String,
    val name: String,
    val dialCode: String,
    val minDigits: Int,
    val maxDigits: Int,
    val pattern: Regex,
    val hintExample: String
) {
    val displayLabel: String get() = "$name ($dialCode)"
}

object CountryPhoneValidator {
    val COUNTRIES: List<CountryPhoneRule> = listOf(
        CountryPhoneRule("IN", "India", "+91", 10, 10, Regex("^[6-9][0-9]{9}$"), "9876543210"),
        CountryPhoneRule("US", "United States", "+1", 10, 10, Regex("^[2-9][0-9]{9}$"), "4155550132"),
        CountryPhoneRule("GB", "United Kingdom", "+44", 10, 10, Regex("^7[0-9]{9}$"), "7911123456"),
        CountryPhoneRule("AE", "UAE", "+971", 9, 9, Regex("^5[024568][0-9]{7}$"), "501234567"),
        CountryPhoneRule("SG", "Singapore", "+65", 8, 8, Regex("^[89][0-9]{7}$"), "81234567"),
        CountryPhoneRule("AU", "Australia", "+61", 9, 9, Regex("^4[0-9]{8}$"), "412345678"),
        CountryPhoneRule("CA", "Canada", "+1", 10, 10, Regex("^[2-9][0-9]{9}$"), "6475550199"),
        CountryPhoneRule("DE", "Germany", "+49", 10, 11, Regex("^1[567][0-9]{8,9}$"), "15123456789"),
        CountryPhoneRule("CH", "Switzerland", "+41", 9, 9, Regex("^7[5-9][0-9]{7}$"), "791234567"),
        CountryPhoneRule("FR", "France", "+33", 9, 9, Regex("^[67][0-9]{8}$"), "612345678"),
        CountryPhoneRule("JP", "Japan", "+81", 10, 10, Regex("^[789]0[0-9]{8}$"), "9012345678"),
        CountryPhoneRule("MY", "Malaysia", "+60", 9, 10, Regex("^1[0-9]{8,9}$"), "123456789"),
        CountryPhoneRule("ID", "Indonesia", "+62", 9, 12, Regex("^8[0-9]{8,11}$"), "81234567890"),
        CountryPhoneRule("PH", "Philippines", "+63", 10, 10, Regex("^9[0-9]{9}$"), "9171234567"),
        CountryPhoneRule("NG", "Nigeria", "+234", 10, 10, Regex("^[789][01][0-9]{8}$"), "8012345678"),
        CountryPhoneRule("ZA", "South Africa", "+27", 9, 9, Regex("^[678][0-9]{8}$"), "821234567"),
        CountryPhoneRule("SA", "Saudi Arabia", "+966", 9, 9, Regex("^5[0-9]{8}$"), "501234567"),
        CountryPhoneRule("QA", "Qatar", "+974", 8, 8, Regex("^[3567][0-9]{7}$"), "55123456"),
        CountryPhoneRule("PK", "Pakistan", "+92", 10, 10, Regex("^3[0-9]{9}$"), "3001234567"),
        CountryPhoneRule("BD", "Bangladesh", "+880", 10, 10, Regex("^1[3-9][0-9]{8}$"), "1712345678"),
        CountryPhoneRule("BR", "Brazil", "+55", 11, 11, Regex("^[1-9]{2}9[0-9]{8}$"), "11987654321"),
        CountryPhoneRule("TR", "Turkey", "+90", 10, 10, Regex("^5[0-9]{9}$"), "5321234567"),
        CountryPhoneRule("KR", "South Korea", "+82", 9, 10, Regex("^1[0-9]{8,9}$"), "1012345678")
    )

    fun findByDialCode(dialCode: String): CountryPhoneRule {
        return COUNTRIES.firstOrNull { it.dialCode == dialCode } ?: COUNTRIES.first()
    }

    /**
     * Strictly validates a local mobile number (digits only) against the selected country rule.
     * Returns null if valid, or a descriptive user-facing error message if invalid.
     */
    fun validate(rule: CountryPhoneRule, rawPhone: String): String? {
        val digits = rawPhone.filter { it.isDigit() }
        if (digits.isEmpty()) {
            return "Mobile number is required for ${rule.name}."
        }
        if (digits.length < rule.minDigits || digits.length > rule.maxDigits) {
            val expected = if (rule.minDigits == rule.maxDigits) {
                "${rule.minDigits} digits"
            } else {
                "${rule.minDigits}–${rule.maxDigits} digits"
            }
            return "${rule.name} (${rule.dialCode}) requires $expected (e.g. ${rule.hintExample})."
        }
        if (!rule.pattern.matches(digits)) {
            return "Invalid mobile format for ${rule.name} (${rule.dialCode}). Example: ${rule.hintExample}"
        }
        return null
    }
}
