package com.example.app.ui.profile

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.app.data.session.SessionRepository
import com.example.app.data.session.SharedPrefsSessionRepository
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

sealed interface ProfileEvent {
    /** Oturum temizlendi — [LoginFragment]’e gidin ve back stack’i sıfırlayın */
    data object NavigateToLogin : ProfileEvent
}

class ProfileViewModel(
    private val sessionRepository: SessionRepository,
) : ViewModel() {

    private val _events = MutableSharedFlow<ProfileEvent>(
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val events: SharedFlow<ProfileEvent> = _events.asSharedFlow()

    fun logout() {
        viewModelScope.launch {
            sessionRepository.clearSession()
            _events.emit(ProfileEvent.NavigateToLogin)
        }
    }

    companion object {
        fun factory(appContext: Context) =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    val repo: SessionRepository = SharedPrefsSessionRepository(appContext)
                    return ProfileViewModel(repo) as T
                }
            }
    }
}
