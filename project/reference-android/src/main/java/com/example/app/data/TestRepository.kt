package com.example.app.data

import com.example.app.model.TestItem

/**
 * Kendi veri katmanınızla değiştirin (Room, Retrofit, vb.).
 */
interface TestRepository {
    suspend fun fetchTests(): List<TestItem>
    suspend fun addTest(item: TestItem)

    /** Uzaktan API çağrınızı burada yapın; başarılı olunca oluşan [TestItem] döndürün. */
    suspend fun publishTest(title: String): TestItem
}
