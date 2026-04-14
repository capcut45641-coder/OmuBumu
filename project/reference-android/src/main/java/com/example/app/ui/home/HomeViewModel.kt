package com.example.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.app.data.InMemoryTestRepository
import com.example.app.data.TestRepository
import com.example.app.model.TestItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HomeUiState(
    val items: List<TestItem> = emptyList(),
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
)

class HomeViewModel(
    private val repository: TestRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        refreshTests()
    }

    fun refreshTests() {
        if (_uiState.value.isRefreshing) return

        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, errorMessage = null) }
            runCatching { repository.fetchTests() }
                .onSuccess { list ->
                    _uiState.update {
                        it.copy(items = list, isRefreshing = false, errorMessage = null)
                    }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isRefreshing = false,
                            errorMessage = e.message ?: "Yükleme başarısız",
                        )
                    }
                }
        }
    }

    companion object {
        fun factory(repository: TestRepository = InMemoryTestRepository) =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T =
                    HomeViewModel(repository) as T
            }
    }
}
