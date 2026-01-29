package com.trackerapp

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.*

class LockModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val dpm: DevicePolicyManager = reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminName: ComponentName = ComponentName(reactContext, MyDeviceAdminReceiver::class.java)

    override fun getName(): String = "LockModule"

    @ReactMethod
    fun enableAdmin() {
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminName)
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Admin rights are required for security features.")
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun lockScreen(promise: Promise) {
        try {
            if (dpm.isAdminActive(adminName)) {
                dpm.lockNow()
                promise.resolve(true)
            } else {
                promise.reject("ERR", "Admin not active")
            }
        } catch (e: Exception) {
            promise.reject("ERR", e.message)
        }
    }

    @ReactMethod
    fun startPinning(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity != null) {
            try {
                val pkgName = reactApplicationContext.packageName
                if (dpm.isDeviceOwnerApp(pkgName)) {
                    val packages = arrayOf(pkgName)
                    dpm.setLockTaskPackages(adminName, packages)
                }
                activity.startLockTask()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", e.message)
            }
        } else {
            promise.reject("ERR", "Activity null")
        }
    }

    @ReactMethod
    fun stopPinning(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity != null) {
            try {
                activity.stopLockTask()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", e.message)
            }
        }
    }

    @ReactMethod
    fun isDeviceOwner(promise: Promise) {
        promise.resolve(dpm.isDeviceOwnerApp(reactApplicationContext.packageName))
    }
    @ReactMethod
    fun openTargetApp(packageName: String) {
        try {
            val launchIntent = reactApplicationContext
                .packageManager
                .getLaunchIntentForPackage(packageName)

            if (launchIntent != null) {
                // Required to start activity from outside an Activity context
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(launchIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

}