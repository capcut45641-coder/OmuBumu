package com.example.app.ui.published

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.example.app.R
import com.example.app.databinding.FragmentTestPublishedBinding

class TestPublishedFragment : Fragment() {

    private var _binding: FragmentTestPublishedBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentTestPublishedBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val goHome: () -> Unit = {
            findNavController().popBackStack(R.id.homeFragment, false)
        }

        binding.buttonGoHome.setOnClickListener { goHome() }
        binding.buttonDone.setOnClickListener { goHome() }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
