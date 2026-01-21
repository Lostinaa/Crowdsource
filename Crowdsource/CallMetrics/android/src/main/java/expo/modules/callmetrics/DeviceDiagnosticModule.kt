package expo.modules.callmetrics
import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.telephony.*
import androidx.core.app.ActivityCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.location.CurrentLocationRequest
import kotlinx.coroutines.*
import kotlinx.coroutines.tasks.await
import java.text.DecimalFormat
class DeviceDiagnosticModule : Module() {

    private val moduleScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun definition() = ModuleDefinition {
        Name("DeviceDiagnosticModule")

        AsyncFunction("checkLocationPermissions") {
            val context = appContext.reactContext ?: throw Exception("Context not found")
            val hasFine = ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val hasBackground = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }

            mapOf("fineLocation" to hasFine, "backgroundLocation" to hasBackground)
        }

        AsyncFunction("getFullDiagnostics") { promise: Promise ->
            moduleScope.launch {
                try {
                    val context = appContext.reactContext ?: throw Exception("Context not found")
                    val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                    val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)

                    val data = mutableMapOf<String, Any?>()

                    // I. DEVICE & NETWORK INFO
                    data["model"] = Build.MODEL
                    data["brand"] = Build.BRAND
                    data["version"] = Build.VERSION.RELEASE
                    data["dataState"] = getNetDataState(tm.dataState)
                    data["dataActivity"] = getNetDataActivity(tm.dataActivity)
                    data["callState"] = getNetCallState(tm.callState)
                    data["simState"] = getNetSimState(tm.simState)
                    data["isRoaming"] = if (tm.isNetworkRoaming) "Yes" else "No"
                    data["operator"] = tm.networkOperatorName

                    // II. GPS LOCATION
                    if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                        val locationRequest = CurrentLocationRequest.Builder()
                            .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
                            .build()

                        val location: Location? = fusedLocationClient.getCurrentLocation(locationRequest, null).await()

                        val df = DecimalFormat("#.#####")
                        data["lat"] = location?.latitude?.let { df.format(it) } ?: "No Fix"
                        data["lon"] = location?.longitude?.let { df.format(it) } ?: "No Fix"
                        data["alt"] = location?.altitude?.let { df.format(it) } ?: "0.0"
                        data["accuracy"] = location?.accuracy?.let { df.format(it) } ?: "0.0"
                    } else {
                        data["lat"] = "Permission Denied"
                    }

                    // III. SIGNAL DATA
                    processSignalAndCell(tm, data)

                    promise.resolve(data)

                } catch (exception: Exception) {
                    promise.reject("ERR_DIAGNOSTICS", exception.message, exception)
                }
            }
        }
    }

    private fun processSignalAndCell(tm: TelephonyManager, data: MutableMap<String, Any?>) {
        try {
            val allCellInfo = tm.allCellInfo
            if (allCellInfo.isNullOrEmpty()) {
                data["netType"] = "Searching..."
                return
            }

            // NSA 5G note:
            // On many devices/carriers, 5G "NR_NSA" is shown as an override on top of an LTE anchor.
            // In that case CellInfoLte is often "registered", while CellInfoNr exists but is not registered.
            // nPerf-style UX should still display 5G when NR neighbors are present.
            val nrCells = allCellInfo.filterIsInstance<CellInfoNr>()
            val hasNrNeighbor = nrCells.any { nr ->
                val ss = nr.cellSignalStrength as? CellSignalStrengthNr
                // Treat as present if SS-RSRP looks like a real value (not default/invalid)
                ss != null && ss.ssRsrp != Int.MAX_VALUE && ss.ssRsrp > -140
            }

            val signalInfo = checkSignalInfo(tm)
            data["rsrp"] = signalInfo[0]
            data["rsrq"] = signalInfo[1]
            data["rssnr"] = signalInfo[2]
            data["cqi"] = signalInfo[3]

            val info = allCellInfo.find { it.isRegistered } ?: allCellInfo[0]
            when (info) {
                is CellInfoLte -> {
                    val id = info.cellIdentity
                    data["netType"] = if (hasNrNeighbor) "5G NR (NSA)" else "4G LTE"
                    data["enb"] = if (id.ci != Int.MAX_VALUE) (id.ci shr 8).toString() else "---"
                    data["eci"] = formatValue(id.ci)
                    data["cellId"] = if (id.ci != Int.MAX_VALUE) (id.ci % 256).toString() else "---"
                    data["tac"] = formatValue(id.tac)
                    data["pci"] = formatValue(id.pci)
                }
                is CellInfoNr -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val id = info.cellIdentity as CellIdentityNr
                        data["netType"] = "5G NR"
                        data["enb"] = if (id.nci != Long.MAX_VALUE) (id.nci / 16384).toString() else "---"
                        data["eci"] = formatValue(id.nci)
                    }
                }
            }
        } catch (exception: Exception) {
            data["netType"] = "Access Denied"
        }
    }

    private fun checkSignalInfo(tm: TelephonyManager): Array<String> {
        val numbers = arrayOf("---", "---", "---", "---")
        
        val safeContext = appContext.reactContext

        if (safeContext != null) {
            val cellInfos: List<CellInfo>? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                if (ActivityCompat.checkSelfPermission(safeContext, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    tm.allCellInfo
                } else {
                    null
                }
            } else null

            if (cellInfos != null && cellInfos.isNotEmpty()) {
                when (val info = cellInfos[0]) {
                    is CellInfoLte -> {
                        val signal = info.cellSignalStrength
                        numbers[0] = formatValue(signal.rsrp)
                        numbers[1] = formatValue(signal.rsrq)
                        numbers[2] = formatValue(signal.rssnr)
                        numbers[3] = formatValue(signal.cqi)
                    }
                    is CellInfoNr -> {
                        val signal = info.cellSignalStrength as CellSignalStrengthNr
                        numbers[0] = formatValue(signal.ssRsrp)
                        numbers[1] = formatValue(signal.ssRsrq)
                        numbers[2] = formatValue(signal.csiSinr)
                        numbers[3] = "---"
                    }
                }
            }
        }
        return numbers
    }

    private fun formatValue(value: Any?): String =
        if (value == null || value == Int.MAX_VALUE || value == Long.MAX_VALUE || value == -1 || value == -1L) "---" else value.toString()

    private fun getNetDataState(s: Int) = when(s) {
        TelephonyManager.DATA_CONNECTED -> "Connected"
        TelephonyManager.DATA_CONNECTING -> "Connecting"
        else -> "Disconnected"
    }

    private fun getNetDataActivity(a: Int) = when(a) {
        TelephonyManager.DATA_ACTIVITY_IN -> "Inbound"
        TelephonyManager.DATA_ACTIVITY_OUT -> "Outbound"
        TelephonyManager.DATA_ACTIVITY_INOUT -> "In/Out"
        else -> "None"
    }

    private fun getNetCallState(s: Int) = when(s) {
        TelephonyManager.CALL_STATE_IDLE -> "Idle"
        TelephonyManager.CALL_STATE_RINGING -> "Ringing"
        else -> "Active"
    }

    private fun getNetSimState(s: Int) = if (s == TelephonyManager.SIM_STATE_READY) "Ready" else "Not Ready"
}