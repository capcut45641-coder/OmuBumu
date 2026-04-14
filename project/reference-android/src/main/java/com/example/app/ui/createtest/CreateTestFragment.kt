package com.example.app.ui.createtest

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.setFragmentResult
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.example.app.R
import com.example.app.databinding.FragmentCreateTestBinding
import com.example.app.ui.TestListKeys
import kotlinx.coroutines.launch

class CreateTestFragment : Fragment() {

    private var _binding: FragmentCreateTestBinding? = null
    private val binding get() = _binding!!

    private val viewModel: CreateTestViewModel by viewModels {
        CreateTestViewModel.factory()
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentCreateTestBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.buttonPublish.setOnClickListener {
            val title = binding.editTitle.text?.toString().orEmpty()
            viewModel.publishTest(title)
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.publishEvents.collect { event ->
                    when (event) {
                        is PublishUiEvent.NavigateToTestPublished -> {
                            setFragmentResult(
                                TestListKeys.REFRESH_LIST_REQUEST_KEY,
                                bundleOf(TestListKeys.REFRESH_LIST_ARG to true),
                            )
                            findNavController().navigate(
                                R.id.action_createTestFragment_to_testPublishedFragment,
                            )
                        }
                        is PublishUiEvent.Error -> {
                            Toast.makeText(requireContext(), event.message, Toast.LENGTH_LONG)
                                .show()
                        }
                    }
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
