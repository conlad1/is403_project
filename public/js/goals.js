(function () {
  const showBtn = document.getElementById('showGoalForm');
  const cancelBtn = document.getElementById('cancelGoalForm');
  const formSection = document.getElementById('goalFormSection');
  const form = document.getElementById('goalForm');
  const goalsList = document.getElementById('goalsList');

  if (!goalsList) return;

  showBtn?.addEventListener('click', () => {
    formSection.classList.remove('hidden');
  });

  cancelBtn?.addEventListener('click', () => {
    formSection.classList.add('hidden');
    form.reset();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const targetDate = form.targetDate.value;

    if (!title) return;

    const id = Date.now().toString();

    const wrapper = document.createElement('div');
    wrapper.className = 'bg-white rounded-xl p-5 shadow-sm border border-gray-200 flex flex-col gap-3';
    wrapper.dataset.goalId = id;
    wrapper.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-sm font-semibold text-gray-900">${title}</h3>
          ${description ? `<p class="text-sm text-gray-600 mt-1">${description}</p>` : ''}
          ${targetDate ? `<p class="text-xs text-gray-400 mt-1">Target: ${targetDate}</p>` : ''}
        </div>
        <button class="text-xs px-2 py-1 rounded-full border text-gray-500 hover:bg-gray-50 toggle-complete-btn">
          Mark complete
        </button>
      </div>
      <div class="mt-2">
        <div class="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span><span class="goal-progress-value">0</span>%</span>
        </div>
        <div class="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div class="h-2 rounded-full bg-indigo-500" style="width: 0%"></div>
        </div>
      </div>
      <div class="flex justify-end">
        <button class="text-xs text-red-500 hover:text-red-600 delete-goal-btn">
          Delete
        </button>
      </div>
    `;

    goalsList.appendChild(wrapper);
    form.reset();
    formSection.classList.add('hidden');
  });

  // Delegated events for complete / delete
  goalsList.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('toggle-complete-btn')) {
      const card = target.closest('[data-goal-id]');
      if (!card) return;
      const progressVal = card.querySelector('.goal-progress-value');
      const bar = card.querySelector('.bg-indigo-500');

      const isComplete = target.textContent.includes('Completed');
      if (isComplete) {
        target.textContent = 'Mark complete';
        if (progressVal) progressVal.textContent = '0';
        if (bar) bar.style.width = '0%';
      } else {
        target.textContent = 'Completed';
        if (progressVal) progressVal.textContent = '100';
        if (bar) bar.style.width = '100%';
      }
    }

    if (target.classList.contains('delete-goal-btn')) {
      const card = target.closest('[data-goal-id]');
      card?.remove();
    }
  });
})();