package com.example.app.ui.createtest

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.app.data.InMemoryTestRepository
import com.example.app.data.TestRepository
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

/**
 * ViewModel → Fragment iletişimi: tek [SharedFlow] (isteğe bağlı olarak [StateFlow] ile
 * yükleme bayrağı genişletilebilir).
 */
sealed interface PublishUiEvent {
    /** API başarılı — [TestPublishedFragment] ekranına gidin */
    data object NavigateToTestPublished : PublishUiEvent

    data class Error(val message: String) : PublishUiEvent
}

class CreateTestViewModel(
    private val repository: TestRepository,
) : ViewModel() {

    private val _publishEvents = MutableSharedFlow<PublishUiEvent>(
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val publishEvents: SharedFlow<PublishUiEvent> = _publishEvents.asSharedFlow()

    fun publishTest(title: String) {
        if (title.isBlank()) {
            viewModelScope.launch {
                _publishEvents.emit(PublishUiEvent.Error("Başlık boş olamaz"))
            }
            return
        }
        viewModelScope.launch {
            runCatching {
                repository.publishTest(title.trim())
            }.onSuccess {
                _publishEvents.emit(PublishUiEvent.NavigateToTestPublished)
            }.onFailure { e ->
                _publishEvents.emit(
                    PublishUiEvent.Error(e.message ?: "Yayınlama başarısız"),
                )
            }
        }
    }

    companion object {
        fun factory(repository: TestRepository = InMemoryTestRepository) =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T =
                    CreateTestViewModel(repository) as T
            }
    }
}
