package com.example.app.data.session

/**
 * Oturum / token saklama. İsterseniz [SharedPrefsSessionRepository] yerine
 * DataStore veya uzaktan auth SDK’sı ile değiştirin.
 */
interface SessionRepository {
    suspend fun clearSession()

    /** Örnek: giriş sonrası token yazma (isteğe bağlı) */
    suspend fun saveAuthToken(token: String)
}
