package com.example.app.data.session

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private const val PREFS_NAME = "app_session"
private const val KEY_AUTH_TOKEN = "auth_token"

/**
 * SharedPreferences tabanlı oturum. DataStore için:
 * `androidx.datastore:datastore-preferences` ekleyip aynı [SessionRepository]
 * arayüzünü uygulayabilirsiniz.
 */
class SharedPrefsSessionRepository(context: Context) : SessionRepository {

    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    override suspend fun clearSession(): Unit = withContext(Dispatchers.IO) {
        prefs.edit().clear().commit()
    }

    override suspend fun saveAuthToken(token: String): Unit = withContext(Dispatchers.IO) {
        prefs.edit().putString(KEY_AUTH_TOKEN, token).apply()
    }

    fun getAuthToken(): String? = prefs.getString(KEY_AUTH_TOKEN, null)
}
