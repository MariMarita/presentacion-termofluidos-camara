const navigation = document.querySelector('.chapter-nav');
const chapterLinks = [...navigation.querySelectorAll('a')];

function markChapter(activeLink) {
  chapterLinks.forEach(link => link.setAttribute('aria-current', String(link === activeLink)));
  if (!activeLink || navigation.scrollWidth <= navigation.clientWidth) return;
  const viewport = navigation.getBoundingClientRect();
  const bounds = activeLink.getBoundingClientRect();
  if (bounds.left < viewport.left || bounds.right > viewport.right) {
    navigation.scrollLeft += bounds.left - viewport.left - (viewport.width - bounds.width) / 2;
  }
}

if (CSS.supports('scroll-target-group: auto') && CSS.supports('selector(:target-current)')) {
  const updateChapter = () => markChapter(navigation.querySelector('a:target-current'));
  document.addEventListener('scrollend', updateChapter);
  requestAnimationFrame(updateChapter);
} else if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.find(entry => entry.isIntersecting);
    if (visible) {
      markChapter(chapterLinks.find(link => link.hash === '#' + visible.target.id));
    }
  }, { rootMargin: '-32% 0px -54% 0px' });
  chapterLinks.forEach(link => observer.observe(document.querySelector(link.hash)));
}

const nativeFocusGroup = Object.hasOwn(HTMLElement.prototype, 'focusGroup');

document.querySelectorAll('[data-tabs]').forEach(container => {
  const tabs = [...container.querySelectorAll('[role="tab"]')];
  const panels = [...container.querySelectorAll('[role="tabpanel"]')];

  function selectTab(selected) {
    tabs.forEach((tab, index) => {
      const active = tab === selected;
      tab.ariaSelected = String(active);
      tab.toggleAttribute('focusgroupstart', active);
      if (!nativeFocusGroup) tab.tabIndex = active ? 0 : -1;
      const panel = panels[index];
      if (active) {
        panel.removeAttribute('hidden');
        if (!panel.querySelector('a[href], button, input')) panel.tabIndex = 0;
      } else {
        panel.setAttribute('hidden', 'until-found');
        panel.removeAttribute('tabindex');
      }
    });
  }

  tabs.forEach((tab, index) => {
    if (nativeFocusGroup) tab.removeAttribute('tabindex');
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('focus', () => selectTab(tab));
    panels[index].addEventListener('beforematch', () => selectTab(tab));
    if (!nativeFocusGroup) {
      tab.addEventListener('keydown', event => {
        const targets = {
          ArrowLeft: (index + tabs.length - 1) % tabs.length,
          ArrowRight: (index + 1) % tabs.length,
          Home: 0,
          End: tabs.length - 1,
        };
        if (!Object.hasOwn(targets, event.key)) return;
        event.preventDefault();
        tabs[targets[event.key]].focus();
      });
    }
  });
  selectTab(tabs.find(tab => tab.ariaSelected === 'true'));
});

if (!('commandForElement' in HTMLButtonElement.prototype)) {
  document.querySelectorAll('button[commandfor]').forEach(button => {
    const dialog = document.getElementById(button.getAttribute('commandfor'));
    button.addEventListener('click', () => {
      if (button.getAttribute('command') === 'show-modal') dialog.showModal();
      if (button.getAttribute('command') === 'close') dialog.close();
    });
  });
}

if (!('closedBy' in HTMLDialogElement.prototype)) {
  document.querySelectorAll('dialog[closedby="any"]').forEach(dialog => {
    let pressedOutside = false;
    const outside = event => {
      const bounds = dialog.getBoundingClientRect();
      return event.target === dialog && (
        event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom
      );
    };
    dialog.addEventListener('pointerdown', event => { pressedOutside = outside(event); });
    dialog.addEventListener('click', event => {
      if (pressedOutside && outside(event)) dialog.close();
      pressedOutside = false;
    });
  });
}

const figureDialog = document.querySelector('#figure-dialog');
const figureImage = document.querySelector('#figure-large');
const figureTitle = document.querySelector('#figure-title');

document.querySelectorAll('[data-figure]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    figureTitle.textContent = link.closest('figure').querySelector('figcaption strong').textContent;
    figureImage.alt = link.querySelector('img').alt;
    figureImage.src = link.href;
    figureDialog.showModal();
  });
});

const times = [0, 2, 4, 6, 8, 10, 12, 14, 16, 17.8, 20, 22, 25, 28, 31, 34, 37, 39.9];
const series = [
  {
    id: 'theoretical', color: '#ddd7eb', width: 1.6, dash: [5, 4],
    samples: [0.60, 1.48, 2.65, 3.95, 5.28, 6.55, 7.72, 8.70, 9.50, 10.12, 10.65, 10.92, 11.05, 10.78, 10.98, 10.66, 10.90, 11.00],
  },
  {
    id: 'simulated', color: '#82d9de', width: 1.9, dash: [],
    samples: [0.60, 1.40, 2.52, 3.80, 5.10, 6.40, 7.58, 8.58, 9.38, 9.97, 10.55, 10.88, 11.08, 10.72, 10.94, 10.58, 10.86, 10.97],
  },
  {
    id: 'experimental', color: '#ff9e70', width: 2.6, dash: [],
    samples: [0.60, 1.35, 2.45, 3.70, 5.05, 6.35, 7.55, 8.60, 9.42, 10.00, 10.52, 10.85, 11.12, 10.65, 10.95, 10.42, 10.82, 10.88],
  },
];

const canvas = document.querySelector('#plot');
const position = document.querySelector('#plot-position');
const plotTime = document.querySelector('#plot-time');
const context = canvas.getContext('2d');
const margins = { left: 38, right: 18, top: 13, bottom: 26 };

function drawPlot() {
  if (!context) return;
  const { width, height } = canvas.getBoundingClientRect();
  if (width <= margins.left + margins.right || height <= margins.top + margins.bottom) return;

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const left = margins.left;
  const right = width - margins.right;
  const top = margins.top;
  const bottom = height - margins.bottom;
  const x = time => left + time / 40 * (right - left);
  const y = temperature => bottom - temperature / 12.5 * (bottom - top);

  context.fillStyle = '#82d9de22';
  context.fillRect(left, y(12), right - left, y(10) - y(12));
  context.font = '11px Inter, system-ui, sans-serif';
  context.strokeStyle = '#424956';
  context.fillStyle = '#cbd0d8';
  context.lineWidth = 1;

  for (let kelvin = 0; kelvin <= 12; kelvin += 2) {
    context.beginPath();
    context.moveTo(left, y(kelvin));
    context.lineTo(right, y(kelvin));
    context.stroke();
    context.fillText(kelvin + ' K', 3, y(kelvin) + 4);
  }

  const step = width < 480 ? 10 : 5;
  context.textAlign = 'center';
  for (let time = 0; time <= 40; time += step) {
    context.beginPath();
    context.moveTo(x(time), top);
    context.lineTo(x(time), bottom);
    context.stroke();
    context.fillText(String(time), x(time), bottom + 17);
  }

  series.forEach(line => {
    context.beginPath();
    context.strokeStyle = line.color;
    context.lineWidth = line.width;
    context.lineJoin = 'round';
    context.setLineDash(line.dash);
    times.forEach((time, index) => {
      const method = index === 0 ? 'moveTo' : 'lineTo';
      context[method](x(time), y(line.samples[index]));
    });
    context.stroke();
  });

  const selected = Number(position.value);
  const marker = x(times[selected]);
  context.beginPath();
  context.strokeStyle = '#eee7df';
  context.lineWidth = 1;
  context.setLineDash([3, 4]);
  context.moveTo(marker, top);
  context.lineTo(marker, bottom);
  context.stroke();
  series.forEach(line => {
    context.beginPath();
    context.fillStyle = line.color;
    context.arc(marker, y(line.samples[selected]), 3.8, 0, Math.PI * 2);
    context.fill();
  });
}

function selectPoint() {
  const index = Number(position.value);
  plotTime.value = times[index].toFixed(1);
  position.setAttribute('aria-valuetext', plotTime.value + ' minutos');
  series.forEach(line => {
    document.getElementById(line.id).textContent = '+' + line.samples[index].toFixed(2) + ' K';
  });
  drawPlot();
}

function pointFromPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const time = (event.clientX - bounds.left - margins.left) /
    (bounds.width - margins.left - margins.right) * 40;
  const index = times.reduce((nearest, sample, candidate) =>
    Math.abs(sample - time) < Math.abs(times[nearest] - time) ? candidate : nearest, 0);
  if (Number(position.value) !== index) {
    position.value = index;
    selectPoint();
  }
}

position.addEventListener('input', selectPoint);
canvas.addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse') pointFromPointer(event);
});
canvas.addEventListener('click', pointFromPointer);
if ('ResizeObserver' in window) new ResizeObserver(drawPlot).observe(canvas);
else window.addEventListener('resize', drawPlot);
selectPoint();
