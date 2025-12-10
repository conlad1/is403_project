(function () {
  const form = document.getElementById('activityForm');
  const list = document.getElementById('activitiesList');
  const emptyState = document.getElementById('activitiesEmpty');

  if (!form || !list) return;

  function showList() {
    emptyState.classList.add('hidden');
    list.classList.remove('hidden');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const task = form.task.value.trim();
    const duration = parseInt(form.duration.value || '0', 10);
    const effectiveness = parseInt(form.effectiveness.value || '0', 10);
    const distractions = parseInt(form.distractions.value || '0', 10);

    if (!task) return;

    const item = document.createElement('div');
    item.className = 'border border-gray-100 rounded-lg px-4 py-3 flex flex-col gap-1';

    item.innerHTML = `
      <div class="flex justify-between items-center text-sm">
        <span class="font-medium text-gray-900">${task}</span>
        <span class="text-xs text-gray-400">${duration || 0} min • Eff: ${effectiveness || 0}/10</span>
      </div>
      <div class="text-xs text-gray-500">
        Distractions: ${distractions || 0}
      </div>
    `;

    list.prepend(item);
    showList();
    form.reset();
  });
})();