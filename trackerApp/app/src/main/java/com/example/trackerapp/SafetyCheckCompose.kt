package com.example.trackerapp

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.InsertDriveFile
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.vectorResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.time.LocalDate

// Define Custom Colors based on the logo theme
val DarkBackground = Color(0xFF0D1117)
val CardBackground = Color(0xFF161B22)
val AccentGreen = Color(0xFF10B981) // Emerald-500
val AccentYellow = Color(0xFFFBBF24) // Yellow-500
val BorderGray = Color(0xFF30363D)
val TextGray = Color(0xFF9CA3AF)

// --- App State Management ---

sealed class ScanState {
    object Initial : ScanState()
    object Scanning : ScanState()
    object Complete : ScanState()
}

// --- Simulation Data ---
const val TOTAL_FILES = 25
val FILE_PATHS = listOf(
    "C:\\Windows\\System32\\ntoskrnl.exe",
    "C:\\Users\\Public\\Documents\\settings.json",
    "D:\\Program Files\\AntiVirus\\scan_engine.dll",
    "C:\\Users\\Admin\\AppData\\Local\\Temp\\cache_001.tmp",
    "C:\\Windows\\Fonts\\arial.ttf",
    "C:\\Users\\Admin\\Documents\\Report_Q3_Final.docx",
    "C:\\ProgramData\\Microsoft\\security.log",
    "C:\\Windows\\System32\\drivers\\etc\\hosts",
    "C:\\Program Files (x86)\\Utility\\launcher.exe",
    "C:\\Users\\Guest\\Downloads\\photo_1.jpg",
    "C:\\Windows\\Explorer\\shell.dll",
    "C:\\Users\\Admin\\Desktop\\Project\\main.js",
    "C:\\Windows\\Globalization\\MUI\\0409\\lang.dat",
    "C:\\Users\\Public\\Videos\\sample.mp4",
    "C:\\Windows\\Temp\\system_update.tmp",
    "C:\\Program Files\\Common Files\\Adobe\\helper.dat",
    "C:\\Users\\Admin\\Documents\\config.ini",
    "C:\\Windows\\SysWOW64\\kernel32.dll",
    "C:\\Users\\Public\\Music\\song.mp3",
    "C:\\Windows\\ServiceProfiles\\LocalService\\NTUSER.DAT",
    "C:\\Program Files\\DataStore\\data.db",
    "C:\\Users\\Admin\\Desktop\\Readme.txt",
    "C:\\Windows\\System32\\userenv.dll",
    "C:\\Users\\Public\\AppCache\\index.html",
    "C:\\Windows\\System32\\calc.exe"
)

// --- Composable Functions ---

@Composable
fun SafetyCheckApp() {
    // State holders
    var scanState by remember { mutableStateOf<ScanState>(ScanState.Initial) }
    var fileIndex by remember { mutableStateOf(0) }
    var currentFile by remember { mutableStateOf("C:\\") }
    var scanStatusText by remember { mutableStateOf("Ready to perform a quick scan.") }

    // Derived progress value (0.0 to 1.0)
    val progressTarget by remember { derivedStateOf { fileIndex.toFloat() / TOTAL_FILES } }
    val animatedProgress = animateFloatAsState(
        targetValue = progressTarget,
        animationSpec = ProgressIndicatorDefaults.ProgressAnimationSpec
    ).value

    // Function to start the scan
    fun startScan() {
        scanState = ScanState.Scanning
        fileIndex = 0
    }

    // Function to reset the app
    fun resetScanner() {
        scanState = ScanState.Initial
        fileIndex = 0
        currentFile = "C:\\"
        scanStatusText = "Ready to perform a quick scan."
    }

    // --- Simulation Logic (Coroutines) ---
    if (scanState is ScanState.Scanning) {
        LaunchedEffect(fileIndex) {
            // Check if the scan is complete
            if (fileIndex >= TOTAL_FILES) {
                delay(300) // Small delay to visually show 100%
                scanState = ScanState.Complete
                return@LaunchedEffect
            }

            // Random delay between 50ms and 200ms
            val randomDelay = (50 + Math.random() * 150).toLong()
            delay(randomDelay)

            // Update UI elements
            fileIndex++
            val pathIndex = fileIndex.coerceAtMost(FILE_PATHS.size - 1)
            currentFile = FILE_PATHS.getOrElse(pathIndex) { "Scanning critical system files..." }

            // Update status text
            scanStatusText = when (fileIndex) {
                in 0..4 -> "Initializing security protocols..."
                in 5..14 -> "Performing deep file inspection..."
                else -> "Verifying system integrity..."
            }
        }
    }

    // --- Main UI Layout ---
    Scaffold(backgroundColor = DarkBackground) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .wrapContentSize(Alignment.Center)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, BorderGray, RoundedCornerShape(12.dp))
                    .background(CardBackground),
                elevation = 8.dp,
                backgroundColor = CardBackground
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    // Header
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Shield Icon (using standard M2 for simplicity, but themed)
                        Icon(
                            imageVector = Icons.Filled.CheckCircle,
                            contentDescription = "Shield Icon",
                            tint = AccentGreen,
                            modifier = Modifier
                                .size(36.dp)
                                .padding(end = 8.dp)
                        )
                        Text(
                            text = "Safety Check",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                    Text(
                        text = "Simulated deep system inspection.",
                        color = TextGray,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )

                    Divider(color = BorderGray, thickness = 1.dp, modifier = Modifier.padding(vertical = 10.dp))

                    // Content based on Scan State
                    when (scanState) {
                        ScanState.Initial -> InitialState(onStartScan = ::startScan)
                        ScanState.Scanning -> ScanningState(
                            animatedProgress = animatedProgress,
                            fileIndex = fileIndex,
                            currentFile = currentFile,
                            scanStatusText = scanStatusText
                        )
                        ScanState.Complete -> ResultState(
                            onRunNewScan = ::resetScanner,
                            totalFiles = TOTAL_FILES
                        )
                    }
                }
            }
        }
    }
}

// --- Initial State Composable ---
@Composable
fun InitialState(onStartScan: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFF0F172A)) // Darker section for content
            .border(1.dp, BorderGray, RoundedCornerShape(8.dp))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Your system is currently protected.",
            color = Color.White,
            fontSize = 18.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Text(
            text = "Ready to perform a quick scan of your system files.",
            color = TextGray,
            fontSize = 14.sp,
            textAlign = TextAlign.Center
        )
    }

    Spacer(modifier = Modifier.height(24.dp))

    Button(
        onClick = onStartScan,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp),
        colors = ButtonDefaults.buttonColors(backgroundColor = AccentGreen),
        shape = RoundedCornerShape(8.dp),
        elevation = ButtonDefaults.elevation(defaultElevation = 8.dp)
    ) {
        Text(text = "Start Full System Scan", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
    }
}

// --- Scanning State Composable ---
@Composable
fun ScanningState(animatedProgress: Float, fileIndex: Int, currentFile: String, scanStatusText: String) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = scanStatusText,
            color = AccentYellow,
            fontSize = 18.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        // Progress Bar
        LinearProgressIndicator(
            progress = animatedProgress,
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            backgroundColor = BorderGray,
            color = AccentGreen // Progress color
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            Text(
                text = "${(animatedProgress * 100).toInt()}% Complete ($fileIndex / $TOTAL_FILES files)",
                color = TextGray,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
            )
        }

        // Current File Display
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xFF0F172A))
                .border(1.dp, BorderGray, RoundedCornerShape(8.dp))
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.InsertDriveFile,
                contentDescription = "File Icon",
                tint = TextGray,
                modifier = Modifier.size(24.dp).padding(end = 8.dp)
            )
            Column {
                Text(
                    text = "Scanning File:",
                    color = TextGray,
                    fontSize = 10.sp
                )
                Text(
                    text = currentFile,
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1
                )
            }
        }
    }
}

// --- Result State Composable ---
@Composable
fun ResultState(onRunNewScan: () -> Unit, totalFiles: Int) {
    val summary = "Scanned $totalFiles files in 8.4 seconds. Last full update: ${LocalDate.now()}"

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AccentGreen.copy(alpha = 0.2f)) // Light green background
            .border(1.dp, AccentGreen, RoundedCornerShape(12.dp))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Filled.CheckCircle,
            contentDescription = "Scan Complete Icon",
            tint = AccentGreen,
            modifier = Modifier.size(64.dp).padding(bottom = 16.dp)
        )
        Text(
            text = "Scan Complete",
            color = AccentGreen,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Text(
            text = "No Threats Found.",
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        Text(
            text = summary,
            color = TextGray,
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(bottom = 24.dp)
        )
        Button(
            onClick = onRunNewScan,
            colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFF4B5563)), // Gray-600
            shape = RoundedCornerShape(8.dp),
            elevation = ButtonDefaults.elevation(defaultElevation = 4.dp)
        ) {
            Text(text = "Run New Scan", color = Color.White, fontWeight = FontWeight.SemiBold)
        }
    }
}

// --- Main Preview for Android Studio ---
@Preview(showBackground = true)
@Composable
fun PreviewSafetyCheckApp() {
    MaterialTheme(colors = darkColors(background = DarkBackground)) {
        SafetyCheckApp()
    }
}