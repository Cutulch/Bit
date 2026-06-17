document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-button]');
  const mobilePanel = document.querySelector('[data-mobile-panel]');
  const mobileLinks = mobilePanel?.querySelectorAll('a') ?? [];

  const setHeaderState = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 16);
  };

  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  const mainNavLinks = Array.from(document.querySelectorAll('.main-nav a[href^="#"]'));
  const mainNavTargets = mainNavLinks
    .map(link => ({
      hash: link.hash,
      link,
      target: document.getElementById(link.hash.slice(1)),
    }))
    .filter(item => item.hash && item.target);

  const setActiveNavLink = hash => {
    mainNavLinks.forEach(link => {
      link.classList.toggle('is-active', link.hash === hash);
    });
  };

  const updateActiveNavLink = () => {
    if (mainNavTargets.length === 0) {
      return;
    }

    const headerOffset = (header?.offsetHeight ?? 0) + 120;
    const activeLine = window.scrollY + headerOffset;
    let activeHash = '#top';

    mainNavTargets.forEach(({ hash, target }) => {
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      if (targetTop <= activeLine) {
        activeHash = hash;
      }
    });

    if (window.scrollY < 80) {
      activeHash = '#top';
    }

    setActiveNavLink(activeHash);
  };

  mainNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      setActiveNavLink(link.hash);
    });
  });

  updateActiveNavLink();
  window.addEventListener('scroll', updateActiveNavLink, { passive: true });
  window.addEventListener('resize', updateActiveNavLink);

  const closeMenu = () => {
    menuButton?.classList.remove('is-open');
    mobilePanel?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    body.classList.remove('menu-open');
  };

  menuButton?.addEventListener('click', () => {
    const isOpen = mobilePanel?.classList.toggle('is-open') ?? false;
    menuButton.classList.toggle('is-open', isOpen);
    menuButton.setAttribute('aria-expanded', String(isOpen));
    body.classList.toggle('menu-open', isOpen);
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Node) || !mobilePanel || !menuButton) {
      return;
    }

    if (!mobilePanel.contains(target) && !menuButton.contains(target)) {
      closeMenu();
    }
  });

  const revealItems = document.querySelectorAll('[data-reveal]');
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -40px' }
  );

  revealItems.forEach(item => revealObserver.observe(item));

  const leadForms = Array.from(document.querySelectorAll('.js-form'));
  const leadFormDefaults = new WeakMap();

  const getLeadFormControls = form => ({
    teacherField: form.querySelector('[data-teacher-field]'),
    teacherInput: form.querySelector('[data-teacher-input]'),
    directionSelect: form.querySelector('[data-direction-select]'),
    branchSelect: form.querySelector('[data-branch-select]'),
    bookingNote: form.querySelector('[data-booking-note]'),
  });

  const getSelectOptions = select => {
    if (!(select instanceof HTMLSelectElement)) {
      return [];
    }

    return Array.from(select.options)
      .filter(option => option.value)
      .map(option => ({
        value: option.value,
        label: option.textContent?.trim() || option.value,
      }));
  };

  const normalizeOption = option => (
    typeof option === 'string' ? { value: option, label: option } : option
  );

  const customSelects = new Map();

  const closeCustomSelect = root => {
    root.classList.remove('is-open');
    root.querySelector('.custom-select__button')?.setAttribute('aria-expanded', 'false');
  };

  const closeCustomSelects = exceptRoot => {
    customSelects.forEach(({ root }) => {
      if (root !== exceptRoot) {
        closeCustomSelect(root);
      }
    });
  };

  const getVisibleSelectOptions = select => Array.from(select.options);

  const refreshCustomSelect = select => {
    const customSelect = customSelects.get(select);
    if (!customSelect) {
      return;
    }

    const { root, button, valueNode, list } = customSelect;
    const options = getVisibleSelectOptions(select);
    const selectedOption = select.selectedOptions[0] || options.find(option => option.value === select.value);
    const selectedText = selectedOption?.textContent?.trim() || customSelect.placeholder;

    valueNode.textContent = selectedText;
    root.classList.toggle('has-value', Boolean(select.value));
    root.classList.toggle('is-disabled', select.disabled);
    button.disabled = select.disabled;
    list.replaceChildren();

    options.forEach(option => {
      const item = document.createElement('button');
      const value = option.value;

      item.type = 'button';
      item.className = 'custom-select__option';
      item.textContent = option.textContent?.trim() || value;
      item.dataset.value = value;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(value === select.value));

      if (option.disabled) {
        item.disabled = true;
        item.setAttribute('aria-disabled', 'true');
      }

      if (value === select.value) {
        item.classList.add('is-selected');
      }

      item.addEventListener('click', () => {
        if (item.disabled) {
          return;
        }

        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        refreshCustomSelect(select);
        closeCustomSelect(root);
        button.focus();
      });

      item.addEventListener('keydown', event => {
        const optionItems = Array.from(list.querySelectorAll('.custom-select__option:not(:disabled)'));
        const currentIndex = optionItems.indexOf(item);

        if (event.key === 'Escape') {
          event.preventDefault();
          closeCustomSelect(root);
          button.focus();
          return;
        }

        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
          return;
        }

        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const nextItem = optionItems[currentIndex + direction] || optionItems[direction > 0 ? 0 : optionItems.length - 1];
        nextItem?.focus();
      });

      list.append(item);
    });
  };

  const setSelectOptions = (select, options, placeholder, selectedValue = '') => {
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    const normalizedOptions = options.map(normalizeOption);
    select.replaceChildren();

    const placeholderOption = new Option(placeholder, '');
    placeholderOption.disabled = true;
    placeholderOption.selected = selectedValue === '';
    select.append(placeholderOption);

    normalizedOptions.forEach(option => {
      select.append(new Option(option.label, option.value));
    });

    if (selectedValue) {
      select.value = selectedValue;
    }

    refreshCustomSelect(select);
  };

  const focusCustomSelect = select => {
    const customSelect = customSelects.get(select);
    if (customSelect) {
      customSelect.button.focus();
      return;
    }

    select.focus();
  };

  const initCustomSelect = select => {
    if (!(select instanceof HTMLSelectElement) || customSelects.has(select)) {
      return;
    }

    const root = document.createElement('div');
    const button = document.createElement('button');
    const valueNode = document.createElement('span');
    const list = document.createElement('div');
    const listId = `${select.id || select.name || 'lead-select'}-custom-list`;
    const label = select.id ? document.querySelector(`label[for="${select.id}"]`) : null;

    root.className = 'custom-select';
    button.className = 'custom-select__button';
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', listId);
    valueNode.className = 'custom-select__value';
    list.className = 'custom-select__list';
    list.id = listId;
    list.setAttribute('role', 'listbox');

    if (label) {
      const labelId = label.id || `${select.id}-label`;
      label.id = labelId;
      button.setAttribute('aria-labelledby', `${labelId} ${select.id}-custom-value`);
      valueNode.id = `${select.id}-custom-value`;

      label.addEventListener('click', event => {
        event.preventDefault();
        focusCustomSelect(select);
      });
    }

    button.append(valueNode);
    root.append(button, list);
    select.before(root);
    root.prepend(select);
    select.classList.add('custom-select__native');
    select.tabIndex = -1;

    customSelects.set(select, {
      root,
      button,
      valueNode,
      list,
      placeholder: select.options[0]?.textContent?.trim() || 'Выберите значение',
    });

    button.addEventListener('click', () => {
      const shouldOpen = !root.classList.contains('is-open');
      closeCustomSelects(root);
      root.classList.toggle('is-open', shouldOpen);
      button.setAttribute('aria-expanded', String(shouldOpen));

      if (shouldOpen) {
        const selectedItem = list.querySelector('.custom-select__option.is-selected:not(:disabled)');
        const firstItem = list.querySelector('.custom-select__option:not(:disabled)');
        (selectedItem || firstItem)?.focus();
      }
    });

    button.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeCustomSelect(root);
        return;
      }

      if (!['ArrowDown', 'Enter', ' '].includes(event.key)) {
        return;
      }

      event.preventDefault();
      closeCustomSelects(root);
      root.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      const selectedItem = list.querySelector('.custom-select__option.is-selected:not(:disabled)');
      const firstItem = list.querySelector('.custom-select__option:not(:disabled)');
      (selectedItem || firstItem)?.focus();
    });

    select.addEventListener('change', () => {
      root.classList.remove('is-invalid');
      refreshCustomSelect(select);
    });

    select.addEventListener('invalid', () => {
      root.classList.add('is-invalid');
      focusCustomSelect(select);
    });

    refreshCustomSelect(select);
  };

  const parseDataList = value => (
    (value || '')
      .split('|')
      .map(item => item.trim())
      .filter(Boolean)
  );

  const getOptionByValue = (options, value) => (
    options.find(option => option.value === value) || { value, label: value }
  );

  const addBranchesToMap = (map, direction, branches) => {
    if (!direction || branches.length === 0) {
      return;
    }

    const current = map.get(direction) || [];
    branches.forEach(branch => {
      if (!current.includes(branch)) {
        current.push(branch);
      }
    });
    map.set(direction, current);
  };

  const directionBranchMap = new Map();
  const teacherButtons = Array.from(document.querySelectorAll('[data-teacher-name]'));

  teacherButtons.forEach(button => {
    const directions = parseDataList(button.dataset.teacherDirections || '');
    const branches = parseDataList(button.dataset.teacherBranches || '');
    directions.forEach(direction => addBranchesToMap(directionBranchMap, direction, branches));
  });

  const directionAliases = new Map([
    [
      'Вокал',
      ['Народный вокал', 'Эстрадный вокал', 'Академический вокал', 'Эстрадно-джазовый вокал'],
    ],
    ['Теория (сольфеджио, гармония, ЭТМ)', ['Теория музыки']],
    ['Электрогитара', ['Электрогитара (база)']],
  ]);

  directionAliases.forEach((aliases, direction) => {
    aliases.forEach(alias => {
      addBranchesToMap(directionBranchMap, direction, directionBranchMap.get(alias) || []);
    });
  });

  leadForms.forEach(form => {
    const { directionSelect, branchSelect } = getLeadFormControls(form);
    leadFormDefaults.set(form, {
      directions: getSelectOptions(directionSelect),
      branches: getSelectOptions(branchSelect),
    });
  });

  leadForms.forEach(form => {
    form.querySelectorAll('select').forEach(initCustomSelect);
  });

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    const clickedSelect = Array.from(customSelects.values()).some(({ root }) => root.contains(target));
    if (!clickedSelect) {
      closeCustomSelects();
    }
  });

  const branchMapButtons = Array.from(document.querySelectorAll('[data-branch-map]'));
  const branchMapFrame = document.querySelector('[data-branch-map-frame]');

  const setBranchMap = branch => {
    const activeButton = branchMapButtons.find(button => button.dataset.branchMap === branch);
    if (!activeButton) {
      return;
    }

    branchMapButtons.forEach(button => {
      button.classList.toggle('is-active', button === activeButton);
    });

    const mapSrc = activeButton.dataset.mapSrc;
    if (
      mapSrc &&
      branchMapFrame instanceof HTMLIFrameElement &&
      branchMapFrame.getAttribute('src') !== mapSrc
    ) {
      branchMapFrame.setAttribute('src', mapSrc);
    }
  };

  const syncBranchMapAvailability = form => {
    const { branchSelect } = getLeadFormControls(form);
    if (!(branchSelect instanceof HTMLSelectElement)) {
      return;
    }

    const availableBranches = Array.from(branchSelect.options)
      .map(option => option.value)
      .filter(Boolean);

    branchMapButtons.forEach(button => {
      const branch = button.dataset.branchMap || '';
      button.disabled = availableBranches.length > 0 && !availableBranches.includes(branch);
    });

    const selectedBranch = branchSelect.value;
    if (selectedBranch) {
      setBranchMap(selectedBranch);
      return;
    }

    const activeButton = branchMapButtons.find(button => button.classList.contains('is-active'));
    if (!activeButton || activeButton.disabled) {
      const firstAvailableButton = branchMapButtons.find(button => !button.disabled);
      if (firstAvailableButton?.dataset.branchMap) {
        setBranchMap(firstAvailableButton.dataset.branchMap);
      }
    }
  };

  const resetLeadFormMode = form => {
    const defaults = leadFormDefaults.get(form);
    if (!defaults) {
      return;
    }

    const { teacherField, teacherInput, directionSelect, branchSelect, bookingNote } =
      getLeadFormControls(form);

    if (teacherField instanceof HTMLElement) {
      teacherField.hidden = true;
    }

    if (teacherInput instanceof HTMLInputElement) {
      teacherInput.value = '';
      teacherInput.disabled = true;
    }

    setSelectOptions(directionSelect, defaults.directions, 'Выберите направление');
    setSelectOptions(branchSelect, defaults.branches, 'Выберите адрес');

    if (bookingNote instanceof HTMLElement) {
      bookingNote.textContent = '';
      bookingNote.hidden = true;
    }

    form.classList.remove('is-teacher-mode');
    syncBranchMapAvailability(form);
  };

  const updateGeneralBranches = form => {
    if (form.classList.contains('is-teacher-mode')) {
      return;
    }

    const defaults = leadFormDefaults.get(form);
    if (!defaults) {
      return;
    }

    const { directionSelect, branchSelect, bookingNote } = getLeadFormControls(form);
    if (!(directionSelect instanceof HTMLSelectElement)) {
      return;
    }

    const direction = directionSelect.value;
    const defaultBranches = defaults.branches.map(option => option.value);
    const hasDirectionBranches = directionBranchMap.has(direction);
    const branchValues = hasDirectionBranches ? directionBranchMap.get(direction) : defaultBranches;
    const branchOptions = branchValues.map(value => getOptionByValue(defaults.branches, value));

    setSelectOptions(
      branchSelect,
      branchOptions,
      'Выберите адрес',
      branchOptions.length === 1 ? branchOptions[0].value : ''
    );

    if (bookingNote instanceof HTMLElement) {
      if (hasDirectionBranches && direction !== 'Пока не знаю' && branchOptions.length > 1) {
        bookingNote.textContent = 'По этому направлению доступны два филиала. Выберите удобный адрес.';
        bookingNote.hidden = false;
      } else {
        bookingNote.textContent = '';
        bookingNote.hidden = true;
      }
    }

    syncBranchMapAvailability(form);
  };

  const applyTeacherMode = (form, teacher) => {
    const directions = parseDataList(teacher.directions);
    const branches = parseDataList(teacher.branches);

    if (!teacher.name || directions.length === 0 || branches.length === 0) {
      return;
    }

    const { teacherField, teacherInput, directionSelect, branchSelect, bookingNote } =
      getLeadFormControls(form);

    if (teacherField instanceof HTMLElement) {
      teacherField.hidden = false;
    }

    if (teacherInput instanceof HTMLInputElement) {
      teacherInput.disabled = false;
      teacherInput.value = teacher.name;
    }

    setSelectOptions(
      directionSelect,
      directions,
      'Выберите направление наставника',
      directions.length === 1 ? directions[0] : ''
    );
    setSelectOptions(
      branchSelect,
      branches,
      'Выберите адрес занятий',
      branches.length === 1 ? branches[0] : ''
    );

    if (bookingNote instanceof HTMLElement) {
      bookingNote.textContent = branches.length > 1
        ? 'Наставник ведет занятия в двух филиалах. Выберите удобный адрес.'
        : '';
      bookingNote.hidden = branches.length <= 1;
    }

    form.classList.add('is-teacher-mode');
    syncBranchMapAvailability(form);
  };

  leadForms.forEach(form => {
    const { directionSelect, branchSelect } = getLeadFormControls(form);
    directionSelect?.addEventListener('change', () => updateGeneralBranches(form));
    branchSelect?.addEventListener('change', () => {
      if (branchSelect instanceof HTMLSelectElement) {
        setBranchMap(branchSelect.value);
      }
    });
  });

  branchMapButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.disabled || !button.dataset.branchMap) {
        return;
      }

      const branch = button.dataset.branchMap;
      leadForms.forEach(form => {
        const { branchSelect } = getLeadFormControls(form);
        if (!(branchSelect instanceof HTMLSelectElement)) {
          return;
        }

        const hasBranch = Array.from(branchSelect.options).some(option => option.value === branch);
        if (hasBranch) {
          branchSelect.value = branch;
          refreshCustomSelect(branchSelect);
        }
      });
      setBranchMap(branch);
    });
  });

  document.querySelectorAll('[data-form-default]').forEach(link => {
    link.addEventListener('click', () => {
      leadForms.forEach(form => {
        if (form.classList.contains('is-teacher-mode')) {
          resetLeadFormMode(form);
        }
        updateGeneralBranches(form);
      });
    });
  });

  teacherButtons.forEach(button => {
    button.addEventListener('click', () => {
      leadForms.forEach(form => {
        applyTeacherMode(form, {
          name: button.dataset.teacherName || '',
          directions: button.dataset.teacherDirections || '',
          branches: button.dataset.teacherBranches || '',
        });
      });
    });
  });

  document.querySelectorAll('[data-teacher-reset]').forEach(button => {
    button.addEventListener('click', () => {
      const form = button.closest('form');
      if (!form) {
        return;
      }

      resetLeadFormMode(form);
      const directionSelect = form.querySelector('[data-direction-select]');
      if (directionSelect instanceof HTMLSelectElement) {
        focusCustomSelect(directionSelect);
      }
    });
  });

  document.querySelectorAll('.js-phone').forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^\d\s()+-]/g, '');
    });
  });

  const showAlert = options => {
    if (window.Swal) {
      window.Swal.fire({
        confirmButtonColor: '#11141c',
        ...options,
      });
      return;
    }

    window.alert(options.text || options.title || 'Сообщение');
  };

  leadForms.forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();

      const agree = form.querySelector('.js-agree');
      const submitButton = form.querySelector('button[type="submit"]');
      const status = form.querySelector('[data-form-status]');

      if (!agree?.checked) {
        showAlert({
          icon: 'warning',
          title: 'Нужно согласие',
          text: 'Подтвердите обработку персональных данных, чтобы отправить заявку.',
        });
        return;
      }

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = 'Отправляем...';
      }

      if (status) {
        status.textContent = 'Отправляем заявку в студию.';
      }

      try {
        const response = await fetch('./sendmessage.php', {
          method: 'POST',
          body: new FormData(form),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || 'Не удалось отправить заявку. Попробуйте позже.');
        }

        form.reset();
        resetLeadFormMode(form);

        if (status) {
          status.textContent = 'Заявка отправлена.';
        }

        showAlert({
          icon: 'success',
          title: 'Заявка отправлена',
          text: result.message || 'Спасибо. Мы свяжемся с вами в рабочее время.',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось отправить заявку.';

        if (status) {
          status.textContent = message;
        }

        showAlert({
          icon: 'error',
          title: 'Ошибка отправки',
          text: message,
        });
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = 'Отправить заявку';
        }
      }
    });
  });
});
