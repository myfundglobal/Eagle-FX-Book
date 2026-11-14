package com.example.ui.auth

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.example.data.model.UserProfile
import com.example.ui.components.GlassCard
import com.example.ui.components.StatusPill
import com.example.ui.theme.CarbonSurface
import com.example.ui.theme.GoldAccent
import com.example.ui.theme.HairlineBorder
import com.example.ui.theme.LossCrimson
import com.example.ui.theme.NeonProfit
import com.example.ui.theme.ObsidianBlack
import com.example.ui.theme.SlateElevated
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.util.CountryPhoneValidator
import com.example.util.ImageEncodingUtils
import kotlinx.coroutines.launch

@Composable
fun ProfileSetupOrEditDialog(
    profile: UserProfile?,
    userEmail: String,
    isOnboarding: Boolean,
    isBusy: Boolean,
    onSave: (
        firstName: String,
        surname: String,
        countryCode: String,
        phoneNumber: String,
        dpBase64: String
    ) -> Unit,
    onDismiss: () -> Unit,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var firstName by remember(profile) { mutableStateOf(profile?.firstName.orEmpty().ifBlank { profile?.name?.split(" ")?.firstOrNull().orEmpty() }) }
    var surname by remember(profile) { mutableStateOf(profile?.surname.orEmpty()) }
    var selectedCountry by remember(profile) {
        mutableStateOf(CountryPhoneValidator.findByDialCode(profile?.countryCode ?: "+91"))
    }
    var phoneNumber by remember(profile) { mutableStateOf(profile?.phoneNumber.orEmpty()) }
    var dpBase64 by remember(profile) { mutableStateOf(profile?.profilePictureBase64.orEmpty()) }
    var countryDropdownExpanded by remember { mutableStateOf(false) }
    var validationError by remember { mutableStateOf<String?>(null) }

    val dpPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                val encoded = ImageEncodingUtils.uriToCompressedBase64(context, uri, maxDimension = 480, quality = 75)
                if (encoded != null) {
                    dpBase64 = encoded
                } else {
                    validationError = "Unable to process selected profile image."
                }
            }
        }
    }

    Dialog(onDismissRequest = { if (!isOnboarding) onDismiss() }) {
        GlassCard(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 680.dp),
            accentBorderColor = GoldAccent.copy(alpha = 0.45f),
            elevated = true
        ) {
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = if (isOnboarding) "Complete Trader Profile" else "Trader Profile",
                            style = MaterialTheme.typography.titleLarge,
                            color = TextPrimary
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Filled.Verified, contentDescription = null, tint = NeonProfit, modifier = Modifier.size(14.dp))
                            Text(
                                text = "Google Account • $userEmail",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextSecondary
                            )
                        }
                    }
                    if (profile?.hasActiveSubscription == true) {
                        StatusPill(text = profile.activePlanName, color = GoldAccent)
                    }
                }

                // Profile Picture (DP) Upload
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    val avatarBitmap = remember(dpBase64) {
                        ImageEncodingUtils.decodeBase64ToImageBitmap(dpBase64)
                    }
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(SlateElevated)
                            .border(2.dp, GoldAccent, CircleShape)
                            .clickable {
                                dpPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            }
                            .testTag("profile_dp_picker"),
                        contentAlignment = Alignment.Center
                    ) {
                        if (avatarBitmap != null) {
                            Image(
                                bitmap = avatarBitmap,
                                contentDescription = "Profile Picture",
                                modifier = Modifier.size(72.dp),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Filled.Person,
                                contentDescription = "Default avatar",
                                tint = GoldAccent,
                                modifier = Modifier.size(34.dp)
                            )
                        }
                    }

                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        OutlinedButton(
                            onClick = {
                                dpPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            },
                            border = BorderStroke(1.dp, GoldAccent.copy(alpha = 0.6f))
                        ) {
                            Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = GoldAccent, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.size(6.dp))
                            Text(if (dpBase64.isBlank()) "Upload DP" else "Change DP", color = GoldAccent)
                        }
                        Text(
                            text = "Eagle FX Book Trader Profile",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextMuted
                        )
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = firstName,
                        onValueChange = { firstName = it },
                        label = { Text("First Name") },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("profile_first_name_input")
                    )
                    OutlinedTextField(
                        value = surname,
                        onValueChange = { surname = it },
                        label = { Text("Surname") },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("profile_surname_input")
                    )
                }

                // Dynamic Country Code Dropdown
                Box(modifier = Modifier.fillMaxWidth()) {
                    Surface(
                        onClick = { countryDropdownExpanded = true },
                        color = SlateElevated,
                        border = BorderStroke(1.dp, HairlineBorder),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("country_code_dropdown")
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("COUNTRY CODE", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                                Text(selectedCountry.displayLabel, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                            }
                            Icon(Icons.Filled.ArrowDropDown, contentDescription = "Select country", tint = GoldAccent)
                        }
                    }

                    DropdownMenu(
                        expanded = countryDropdownExpanded,
                        onDismissRequest = { countryDropdownExpanded = false },
                        modifier = Modifier
                            .background(CarbonSurface)
                            .heightIn(max = 280.dp)
                    ) {
                        CountryPhoneValidator.COUNTRIES.forEach { rule ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        text = "${rule.name} (${rule.dialCode})",
                                        color = TextPrimary
                                    )
                                },
                                onClick = {
                                    selectedCountry = rule
                                    countryDropdownExpanded = false
                                    validationError = null
                                }
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = phoneNumber,
                    onValueChange = { input ->
                        phoneNumber = input.filter { it.isDigit() }.take(selectedCountry.maxDigits + 1)
                        validationError = null
                    },
                    label = { Text("Mobile Number (${selectedCountry.dialCode})") },
                    placeholder = { Text("e.g. ${selectedCountry.hintExample}") },
                    prefix = { Text("${selectedCountry.dialCode} ", color = GoldAccent, fontWeight = FontWeight.Bold) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("profile_phone_input")
                )

                Text(
                    text = "Strict validation: ${selectedCountry.name} requires ${if (selectedCountry.minDigits == selectedCountry.maxDigits) "${selectedCountry.minDigits}" else "${selectedCountry.minDigits}-${selectedCountry.maxDigits}"} digits.",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextMuted
                )

                if (validationError != null) {
                    Text(
                        text = validationError!!,
                        style = MaterialTheme.typography.bodySmall,
                        color = LossCrimson
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (isOnboarding) {
                        OutlinedButton(onClick = onSignOut, modifier = Modifier.weight(1f)) {
                            Text("Sign Out")
                        }
                    } else {
                        OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) {
                            Text("Cancel")
                        }
                    }
                    Button(
                        onClick = {
                            if (firstName.trim().length < 2 || surname.trim().isEmpty()) {
                                validationError = "Please enter both First Name and Surname."
                                return@Button
                            }
                            val phoneErr = CountryPhoneValidator.validate(selectedCountry, phoneNumber)
                            if (phoneErr != null) {
                                validationError = phoneErr
                                return@Button
                            }
                            validationError = null
                            onSave(
                                firstName.trim(),
                                surname.trim(),
                                selectedCountry.dialCode,
                                phoneNumber.filter { it.isDigit() },
                                dpBase64
                            )
                        },
                        enabled = !isBusy,
                        colors = ButtonDefaults.buttonColors(containerColor = GoldAccent, contentColor = TextPrimary),
                        modifier = Modifier
                            .weight(1.4f)
                            .testTag("save_profile_button")
                    ) {
                        Icon(Icons.Filled.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.size(6.dp))
                        Text("Save Profile", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
