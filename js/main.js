document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu?.querySelectorAll('a') ?? [];

  function closeMobileMenu() {
    if (!mobileMenu || !menuToggle) {
      return;
    }

    mobileMenu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function openMobileMenu() {
    if (!mobileMenu || !menuToggle) {
      return;
    }

    mobileMenu.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  menuToggle?.addEventListener('click', () => {
    if (!mobileMenu?.classList.contains('is-open')) {
      openMobileMenu();
      return;
    }

    closeMobileMenu();
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => closeMobileMenu());
  });

  document.addEventListener('click', event => {
    if (!mobileMenu || !menuToggle) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    const clickedOutsideMenu = !mobileMenu.contains(target) && !menuToggle.contains(target);
    if (clickedOutsideMenu) {
      closeMobileMenu();
    }
  });

  const animatedItems = document.querySelectorAll('.element-animation');
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('element-show');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  animatedItems.forEach(item => observer.observe(item));

  const phoneInputs = document.querySelectorAll('.js-phone');
  phoneInputs.forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^\d\s()+-]/g, '');
    });
  });

  const forms = document.querySelectorAll('.js-form');
  forms.forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();

      const agree = form.querySelector('.js-agree');
      if (!agree?.checked) {
        Swal.fire({
          icon: 'warning',
          title: 'Ошибка',
          text: 'Пожалуйста, подтвердите согласие на обработку персональных данных.',
          confirmButtonColor: '#1ba870',
        });
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
      }

      try {
        const formData = new FormData(form);
        const response = await fetch('./sendmessage.php', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || 'Не удалось отправить заявку. Попробуйте позже.');
        }

        Swal.fire({
          icon: 'success',
          title: 'Заявка отправлена',
          text: result.message || 'Спасибо! Мы свяжемся с вами в рабочее время.',
          confirmButtonColor: '#1ba870',
        });

        form.reset();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось отправить заявку.';

        Swal.fire({
          icon: 'error',
          title: 'Ошибка',
          text: errorMessage,
          confirmButtonColor: '#1ba870',
        });
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
        }
      }
    });
  });
});