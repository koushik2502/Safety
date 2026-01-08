package com.trackerapp

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LockModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val componentName by lazy {
        ComponentName(reactApplicationContext, MyDeviceAdminReceiver::class.java)
    }

    override fun getName(): String {
        return "LockModule"
    }

    @ReactMethod
    fun isAdminActive(promise: Promise) {
        val devicePolicyManager = reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val isActive = devicePolicyManager.isAdminActive(componentName)
        promise.resolve(isActive)
    }

    @ReactMethod
    fun enableAdmin() {
        val activity = reactApplicationContext.currentActivity ?: return

        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, componentName)
            putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "This permission is required to lock the app.")
        }
        activity.startActivity(intent)
    }

    @ReactMethod
    fun lockScreen(promise: Promise) {
        val devicePolicyManager = reactApplicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        if (devicePolicyManager.isAdminActive(componentName)) {
            devicePolicyManager.lockNow()
            promise.resolve(true)
        } else {
            promise.reject("NOT_ADMIN", "Device Admin is not active")
        }
    }

    @ReactMethod
    fun startPinning(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity != null) {
            activity.runOnUiThread {
                try {
                    activity.startLockTask()
                    promise.resolve(true)
                } catch (e: Exception) {
                    promise.reject("PIN_ERROR", e.message)
                }
            }
        } else {
            promise.reject("NO_ACTIVITY", "Current activity is null")
        }
    }

    @ReactMethod
    fun stopPinning(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity != null) {
            activity.runOnUiThread {
                try {
                    activity.stopLockTask()
                    promise.resolve(true)
                } catch (e: Exception) {
                    promise.reject("UNPIN_ERROR", e.message)
                }
            }
        } else {
            promise.reject("NO_ACTIVITY", "Current activity is null")
        }
    }
}
