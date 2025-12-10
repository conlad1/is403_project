(function () {
  const form = document.getElementById('activityForm');
  const list = document.getElementById('activitiesList');
  const emptyState = document.getElementById('activitiesEmpty');
  const daySelector = document.getElementById('daySelector');

  const activityNameInput = document.getElementById('activityName');
  const activityDateInput = document.getElementById('activityDate');
  const startInput = document.getElementById('startTime');
  const endInput = document.getElementById('endTime');
  const durationDisplay = document.getElementById('durationDisplay');
  const effectivenessSlider = document.getElementById('effectiveness');
  const effectivenessValue = document.getElementById('effectivenessValue');
  const distractionsInput = document.getElementById('distractions');

  if (!form || !list || !daySelector) return;

  const data = window.ACTIVITY_DATA || {};
  const activitiesByDate = data.activitiesByDate || {};
  let currentDate = data.today || new Date().toISOString().slice(0, 10);
  let editing = null; // { date, index }

  daySelector.value = currentDate;

  function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '0 min';
    if (minutes < 60) return minutes + ' min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!m) return h + ' hr' + (h > 1 ? 's' : '');
    return h + ' hr ' + m + ' min';
  }

  function calculateDuration() {
    const start = startInput.value;
    const end = endInput.value;
    if (!start || !end) {
      durationDisplay.textContent = 'Duration: --';
      return 0;
    }

    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);

    let startMinutes = sH * 60 + sM;
    let endMinutes = eH * 60 + eM;

    // Allow crossing midnight
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    const diff = endMinutes - startMinutes;
    durationDisplay.textContent = 'Duration: ' + formatDuration(diff);
    return diff;
  }

  function getActivitiesForDate(date) {
    return activitiesByDate[date] || [];
  }

  function renderList() {
    const date = currentDate;
    const activities = getActivitiesForDate(date);
    list.innerHTML = '';

    if (!activities.length) {
      emptyState.classList.remove('hidden');
      list.classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    list.classList.remove('hidden');

    activities.forEach((a, index) => {
      const li = document.createElement('li');
      li.className =
        'rounded-xl bg-slate-800/80 border border-slate-700 p-4 flex justify-between gap-4 items-start';
      li.dataset.date = date;
      li.dataset.index = String(index);
      if (a.activitysessionid) {
        li.dataset.activitysessionid = String(a.activitysessionid);
      }

      li.innerHTML = `
        <div>
          <div class="text-sm font-medium text-slate-100">
            ${a.activity || 'Untitled task'}
          </div>
          <div class="mt-1 text-xs text-slate-400">
            ${a.startTime}–${a.endTime} • ${formatDuration(a.durationMinutes)}
          </div>
          <div class="mt-1 text-xs text-slate-500">
            Effectiveness:
            <span class="font-medium text-blue-300">${a.effectiveness}/10</span>
            ·
            Distractions:
            <span class="font-medium text-rose-300">${a.distractions}</span>
          </div>
        </div>
        <div class="flex flex-col gap-2 shrink-0">
          <button
            type="button"
            class="editBtn text-xs px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100">
            Edit
          </button>
          <button
            type="button"
            class="deleteBtn text-xs px-2 py-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white">
            Delete
          </button>
        </div>
      `;

      list.appendChild(li);
    });
  }

  // Event wiring
  startInput.addEventListener('change', calculateDuration);
  endInput.addEventListener('change', calculateDuration);

  effectivenessSlider.addEventListener('input', function () {
    effectivenessValue.textContent = this.value;
  });

  daySelector.addEventListener('change', function () {
    currentDate = this.value || currentDate;
    editing = null;
    form.reset();
    effectivenessSlider.value = 7;
    effectivenessValue.textContent = '7';
    durationDisplay.textContent = 'Duration: --';
    // Clear any hidden activitysessionid input
    const existingIdInput = form.querySelector('input[name="activitysessionid"]');
    if (existingIdInput) {
      existingIdInput.remove();
    }
    renderList();
  });

  list.addEventListener('click', function (e) {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const li = target.closest('li');
    if (!li) return;

    const date = li.dataset.date;
    const index = parseInt(li.dataset.index || '0', 10);
    const activities = getActivitiesForDate(date);
    const activity = activities[index];

    if (!activity || !activity.activitysessionid) return;

    if (target.classList.contains('deleteBtn')) {
      if (!confirm('Are you sure you want to delete this activity?')) {
        return;
      }

      // Delete from server
      fetch(`/log-activity/${activity.activitysessionid}`, {
        method: 'DELETE'
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Remove from local data
            activities.splice(index, 1);
            if (!activities.length) {
              delete activitiesByDate[date];
            }
            if (currentDate === date) {
              renderList();
            }
          } else {
            alert('Error deleting activity. Please try again.');
          }
        })
        .catch(err => {
          console.error('Delete error:', err);
          alert('Error deleting activity. Please try again.');
        });
      return;
    }

    if (target.classList.contains('editBtn')) {
      // Load activity data into form
      activityNameInput.value = activity.activity || '';
      activityDateInput.value = activity.date || date;
      startInput.value = activity.startTime || '';
      endInput.value = activity.endTime || '';
      effectivenessSlider.value = activity.effectiveness || 7;
      effectivenessValue.textContent = String(activity.effectiveness || 7);
      distractionsInput.value = activity.distractions || 0;
      calculateDuration();

      // Store the activitysessionid for editing
      editing = { 
        activitysessionid: activity.activitysessionid,
        date: activity.date || date, 
        index: index 
      };
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const activity = activityNameInput.value.trim();
    if (!activity) {
      alert('Please enter an activity name');
      return;
    }

    const date = activityDateInput.value || currentDate;
    const startTime = startInput.value;
    const endTime = endInput.value;
    const durationMinutes = calculateDuration();
    const effectiveness = parseInt(effectivenessSlider.value, 10) || 0;
    const distractionsValue = distractionsInput.value;
    const distractions =
      distractionsValue === '' ? 0 : parseInt(distractionsValue, 10);

    // Submit to server using URL-encoded format (Express can parse this)
    const params = new URLSearchParams();
    params.append('activitydate', date);
    params.append('starttime', startTime);
    params.append('endtime', endTime);
    params.append('durationminutes', durationMinutes);
    params.append('activitytitle', activity);
    params.append('effectivenessscore', effectiveness);
    params.append('distractioncount', distractions);
    params.append('notes', '');

    // If editing, include the activitysessionid
    if (editing && editing.activitysessionid) {
      params.append('activitysessionid', editing.activitysessionid);
    }

    fetch('/log-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    })
      .then(response => {
        if (response.redirected) {
          window.location.href = response.url;
        } else {
          // If not redirected, reload the page to show updated data
          window.location.reload();
        }
      })
      .catch(err => {
        console.error('Error submitting activity:', err);
        alert('Error saving activity. Please try again.');
      });
  });

  // Initial render
  renderList();
  calculateDuration();
})();