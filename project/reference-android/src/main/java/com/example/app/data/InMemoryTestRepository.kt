package com.example.app.data

import com.example.app.model.TestItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.UUID

/**
 * Örnek: Home ve Create ekranlarının aynı bellek listesini kullanması için.
 * Gerçek uygulamada Room / API kullanın; ViewModelFactory'de aynı repository örneğini verin.
 */
object InMemoryTestRepository : TestRepository {

    private val mutex = Mutex()
    private val items = MutableStateFlow<List<TestItem>>(emptyList())

    override suspend fun fetchTests(): List<TestItem> = mutex.withLock {
        items.value.toList()
    }

    override suspend fun addTest(item: TestItem) = mutex.withLock {
        items.update { current -> current + item }
    }

    override suspend fun publishTest(title: String): TestItem {
        val item = TestItem(id = UUID.randomUUID().toString(), title = title)
        addTest(item)
        return item
    }
}
