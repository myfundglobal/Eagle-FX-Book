package com.example.ui.auth

import android.util.Patterns
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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MarkEmailRead
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import com.example.R
import com.example.auth.attemptAutoSignIn
import com.example.auth.onGoogleSignInClicked
import com.example.ui.components.GlassCard
import com.example.ui.theme.BrandRed
import com.example.ui.theme.HairlineBorder
import com.example.ui.theme.LossCrimson
import com.example.ui.theme.LossCrimsonGlow
import com.example.ui.theme.NeonProfit
import com.example.ui.theme.NeonProfitGlow
import com.example.ui.theme.ObsidianBlack
import com.example.ui.theme.SlateElevated
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.google.firebase.Firebase
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.auth.auth
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

private enum class AuthMode { Login, SignUp, Forgot }

@Composable
fun AuthScreen(
    onAuthSuccess: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val credentialManager = remember(context) { CredentialManager.create(context) }

    var mode by remember { mutableStateOf(AuthMode.Login) }
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var acceptedTerms by remember { mutableStateOf(false) }
    var showPassword by remember { mutableStateOf(false) }
    var showConfirm by remember { mutableStateOf(false) }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var infoMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        attemptAutoSignIn(
            context = context,
            credentialManager = credentialManager,
            onAuthSuccess = onAuthSuccess,
            onUnauthenticated = {},
            scope = scope
        )
    }

    fun switchMode(next: AuthMode) {
        mode = next
        errorMessage = null
        infoMessage = null
    }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = BrandRed,
        unfocusedBorderColor = HairlineBorder,
        focusedContainerColor = SlateElevated,
        unfocusedContainerColor = SlateElevated,
        focusedTextColor = TextPrimary,
        unfocusedTextColor = TextPrimary,
        focusedLabelColor = BrandRed,
        unfocusedLabelColor = TextMuted,
        cursorColor = BrandRed
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        BrandRed.copy(alpha = 0.16f),
                        ObsidianBlack
                    ),
                    radius = 950f
                )
            )
            .safeDrawingPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Column(
                modifier = Modifier.widthIn(max = 430.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Brand Emblem Header
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(76.dp)
                            .shadow(
                                elevation = 24.dp,
                                shape = RoundedCornerShape(20.dp),
                                spotColor = BrandRed.copy(alpha = 0.45f)
                            )
                            .clip(RoundedCornerShape(20.dp))
                            .border(1.dp, BrandRed.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.app_icon_emblem_1794684148106),
                            contentDescription = "Eagle FX Book Logo",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                    Text(
                        text = "EAGLE FX BOOK",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.6.sp,
                        color = TextPrimary
                    )
                    Text(
                        text = "“Master your mind, master the market.”",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted,
                        textAlign = TextAlign.Center
                    )
                }

                // Auth Glass Card
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    accentBorderColor = BrandRed.copy(alpha = 0.35f),
                    elevated = true
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Segmented Login / Sign Up Switch
                        if (mode != AuthMode.Forgot) {
                            Surface(
                                color = SlateElevated,
                                border = BorderStroke(1.dp, HairlineBorder),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    listOf(
                                        AuthMode.Login to "Login",
                                        AuthMode.SignUp to "Sign Up"
                                    ).forEach { (tabMode, label) ->
                                        val active = mode == tabMode
                                        Surface(
                                            color = if (active) BrandRed else Color.Transparent,
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(42.dp)
                                                .clip(RoundedCornerShape(10.dp))
                                                .clickable { switchMode(tabMode) }
                                                .testTag("auth_tab_${tabMode.name.lowercase()}")
                                        ) {
                                            Box(contentAlignment = Alignment.Center) {
                                                Text(
                                                    text = label,
                                                    style = MaterialTheme.typography.labelLarge,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (active) Color.White else TextMuted
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Filled.MarkEmailRead, contentDescription = null, tint = BrandRed)
                                Text(
                                    text = "Reset Password",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                            }
                            Text(
                                text = "Enter your registered email address and we will send a reset link.",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }

                        if (errorMessage != null) {
                            Surface(
                                color = LossCrimsonGlow,
                                border = BorderStroke(1.dp, LossCrimson.copy(alpha = 0.5f)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = errorMessage!!,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = LossCrimson,
                                    modifier = Modifier.padding(12.dp)
                                )
                            }
                        }

                        if (infoMessage != null) {
                            Surface(
                                color = NeonProfitGlow,
                                border = BorderStroke(1.dp, NeonProfit.copy(alpha = 0.5f)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = infoMessage!!,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = NeonProfit,
                                    modifier = Modifier.padding(12.dp)
                                )
                            }
                        }

                        if (mode == AuthMode.SignUp) {
                            OutlinedTextField(
                                value = fullName,
                                onValueChange = { fullName = it },
                                label = { Text("Full Name") },
                                leadingIcon = {
                                    Icon(Icons.Filled.Person, contentDescription = null, tint = TextMuted)
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                                shape = RoundedCornerShape(14.dp),
                                colors = fieldColors,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("signup_name_input")
                            )
                        }

                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            label = { Text("Email Address") },
                            leadingIcon = {
                                Icon(Icons.Filled.Email, contentDescription = null, tint = TextMuted)
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Email,
                                imeAction = if (mode == AuthMode.Forgot) ImeAction.Done else ImeAction.Next
                            ),
                            shape = RoundedCornerShape(14.dp),
                            colors = fieldColors,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("auth_email_input")
                        )

                        if (mode != AuthMode.Forgot) {
                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it },
                                label = { Text("Password") },
                                leadingIcon = {
                                    Icon(Icons.Filled.Lock, contentDescription = null, tint = TextMuted)
                                },
                                trailingIcon = {
                                    IconButton(onClick = { showPassword = !showPassword }) {
                                        Icon(
                                            imageVector = if (showPassword) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                                            contentDescription = if (showPassword) "Hide password" else "Show password",
                                            tint = TextMuted
                                        )
                                    }
                                },
                                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Password,
                                    imeAction = if (mode == AuthMode.SignUp) ImeAction.Next else ImeAction.Done
                                ),
                                shape = RoundedCornerShape(14.dp),
                                colors = fieldColors,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("auth_password_input")
                            )
                        }

                        if (mode == AuthMode.SignUp) {
                            OutlinedTextField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it },
                                label = { Text("Confirm Password") },
                                leadingIcon = {
                                    Icon(Icons.Filled.Lock, contentDescription = null, tint = TextMuted)
                                },
                                trailingIcon = {
                                    IconButton(onClick = { showConfirm = !showConfirm }) {
                                        Icon(
                                            imageVector = if (showConfirm) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                                            contentDescription = if (showConfirm) "Hide confirm password" else "Show confirm password",
                                            tint = TextMuted
                                        )
                                    }
                                },
                                visualTransformation = if (showConfirm) VisualTransformation.None else PasswordVisualTransformation(),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Password,
                                    imeAction = ImeAction.Done
                                ),
                                shape = RoundedCornerShape(14.dp),
                                colors = fieldColors,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("signup_confirm_password_input")
                            )

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { acceptedTerms = !acceptedTerms }
                            ) {
                                Checkbox(
                                    checked = acceptedTerms,
                                    onCheckedChange = { acceptedTerms = it },
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = BrandRed,
                                        checkmarkColor = Color.White,
                                        uncheckedColor = HairlineBorder
                                    )
                                )
                                Text(
                                    text = "I agree to the Eagle FX Book Terms & Privacy Policy.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextSecondary
                                )
                            }
                        }

                        if (mode == AuthMode.Login) {
                            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
                                TextButton(
                                    onClick = { switchMode(AuthMode.Forgot) },
                                    modifier = Modifier.testTag("forgot_password_button")
                                ) {
                                    Text(
                                        text = "Forgot password?",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = BrandRed,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }

                        // Primary Action Button
                        Button(
                            onClick = {
                                errorMessage = null
                                infoMessage = null
                                val cleanEmail = email.trim()

                                if (!Patterns.EMAIL_ADDRESS.matcher(cleanEmail).matches()) {
                                    errorMessage = "Please enter a valid email address."
                                    return@Button
                                }

                                when (mode) {
                                    AuthMode.Login -> {
                                        if (password.length < 8) {
                                            errorMessage = "Password must be at least 8 characters."
                                            return@Button
                                        }
                                        isLoading = true
                                        scope.launch {
                                            try {
                                                Firebase.auth.signInWithEmailAndPassword(cleanEmail, password).await()
                                                onAuthSuccess()
                                            } catch (e: Exception) {
                                                errorMessage = e.localizedMessage ?: "Sign-in failed. Check your credentials."
                                            } finally {
                                                isLoading = false
                                            }
                                        }
                                    }

                                    AuthMode.SignUp -> {
                                        val cleanName = fullName.trim()
                                        if (cleanName.length < 2) {
                                            errorMessage = "Please enter your full name."
                                            return@Button
                                        }
                                        if (password.length < 8) {
                                            errorMessage = "Password must be at least 8 characters."
                                            return@Button
                                        }
                                        if (password != confirmPassword) {
                                            errorMessage = "Passwords do not match."
                                            return@Button
                                        }
                                        if (!acceptedTerms) {
                                            errorMessage = "Please accept the Terms & Privacy Policy."
                                            return@Button
                                        }
                                        isLoading = true
                                        scope.launch {
                                            try {
                                                val result = Firebase.auth.createUserWithEmailAndPassword(cleanEmail, password).await()
                                                result.user?.let { created ->
                                                    val profileReq = UserProfileChangeRequest.Builder()
                                                        .setDisplayName(cleanName)
                                                        .build()
                                                    runCatching { created.updateProfile(profileReq).await() }
                                                    runCatching { created.sendEmailVerification().await() }
                                                }
                                                onAuthSuccess()
                                            } catch (e: Exception) {
                                                errorMessage = e.localizedMessage ?: "Account creation failed. Please try again."
                                            } finally {
                                                isLoading = false
                                            }
                                        }
                                    }

                                    AuthMode.Forgot -> {
                                        isLoading = true
                                        scope.launch {
                                            try {
                                                Firebase.auth.sendPasswordResetEmail(cleanEmail).await()
                                                infoMessage = "Password reset link sent to your email inbox."
                                            } catch (e: Exception) {
                                                errorMessage = e.localizedMessage ?: "Could not send password reset email."
                                            } finally {
                                                isLoading = false
                                            }
                                        }
                                    }
                                }
                            },
                            enabled = !isLoading,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                                .testTag("primary_auth_button"),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = BrandRed,
                                contentColor = Color.White
                            )
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.2.dp
                                )
                            } else {
                                Text(
                                    text = when (mode) {
                                        AuthMode.Login -> "Login to Terminal"
                                        AuthMode.SignUp -> "Create Account"
                                        AuthMode.Forgot -> "Send Reset Email"
                                    },
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        if (mode == AuthMode.Forgot) {
                            OutlinedButton(
                                onClick = { switchMode(AuthMode.Login) },
                                border = BorderStroke(1.dp, HairlineBorder),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                Text("Back to Login", color = TextPrimary, fontWeight = FontWeight.SemiBold)
                            }
                        } else {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                            ) {
                                HorizontalDivider(modifier = Modifier.weight(1f), color = HairlineBorder)
                                Text("OR", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                                HorizontalDivider(modifier = Modifier.weight(1f), color = HairlineBorder)
                            }

                            OutlinedButton(
                                onClick = {
                                    errorMessage = null
                                    infoMessage = null
                                    isLoading = true
                                    onGoogleSignInClicked(
                                        context = context,
                                        credentialManager = credentialManager,
                                        onAuthSuccess = {
                                            isLoading = false
                                            onAuthSuccess()
                                        },
                                        onAuthError = { msg ->
                                            isLoading = false
                                            errorMessage = msg
                                        },
                                        scope = scope,
                                        onAuthCancelled = { isLoading = false }
                                    )
                                },
                                enabled = !isLoading,
                                border = BorderStroke(1.dp, HairlineBorder),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    containerColor = SlateElevated,
                                    contentColor = TextPrimary
                                ),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp)
                                    .testTag("google_sign_in_button")
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.VerifiedUser,
                                    contentDescription = null,
                                    tint = BrandRed,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.size(10.dp))
                                Text(
                                    text = "Continue with Google",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }

                Text(
                    text = "Eagle FX Book • Personal Trading Journal & Market Desk",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextMuted,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
