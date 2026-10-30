(() => {
  'use strict';

  if (window.SpeedwashWinterVideo) return;

  const script = document.currentScript;
  const base = new URL('./', script ? script.src : location.href);
  const source = new URL('assets/heating-guide.mp4', base).href;
  const poster = new URL('assets/preview.png', base).href;
  const triggerSelector = 'a[href="#sw-winter-video"], [data-sw-winter-video]';
  let dialog;
  let video;
  let error;
  let returnFocus;
  let bodyStyles;

  function buildPlayer() {
    if (dialog) return;

    const style = document.createElement('style');
    style.textContent = `
      .sw-winter-dialog {
        position: fixed; inset: 0; width: fit-content; height: fit-content;
        max-width: calc(100vw - 32px); max-height: calc(100dvh - 32px);
        margin: auto; padding: 0; border: 0; border-radius: 16px;
        overflow: hidden; background: #0b0b0b; color: #fff;
        box-shadow: 0 20px 80px rgba(0,0,0,.35);
      }
      .sw-winter-dialog::backdrop { background: rgba(0,0,0,.8); }
      .sw-winter-dialog__video {
        display: block; width: min(360px, calc((100dvh - 64px) * .5625), calc(100vw - 32px));
        height: auto; max-height: calc(100dvh - 64px); aspect-ratio: 9 / 16;
        margin: 0; background: #000; object-fit: contain;
      }
      .sw-winter-dialog__close {
        position: absolute; z-index: 2; top: 10px; right: 10px;
        display: grid; place-items: center; width: 44px; height: 44px;
        margin: 0; padding: 0 0 3px; border: 1px solid rgba(255,255,255,.25);
        border-radius: 50%; background: rgba(0,0,0,.7); color: #fff;
        font: 32px/1 Arial,sans-serif; cursor: pointer;
      }
      .sw-winter-dialog__close:hover { background: #000; }
      .sw-winter-dialog__close:focus-visible { outline: 2px solid #fff; outline-offset: -5px; }
      .sw-winter-dialog__error {
        position: absolute; bottom: 58px; left: 12px; right: 12px;
        margin: 0; padding: 12px; border-radius: 8px; background: rgba(0,0,0,.85);
        font: 14px/1.5 Manrope,Arial,sans-serif;
      }
      .sw-winter-dialog__error a { color: #fff !important; text-decoration: underline; }
      .sw-winter-dialog__error[hidden] { display: none; }
    `;
    document.head.append(style);

    dialog = document.createElement('dialog');
    dialog.className = 'sw-winter-dialog';
    dialog.setAttribute('aria-label', 'Видео: направляющая с греющим кабелем');

    video = document.createElement('video');
    video.className = 'sw-winter-dialog__video';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.poster = poster;
    video.setAttribute('aria-label', 'Демонстрация направляющей и греющего кабеля');

    const closeButton = document.createElement('button');
    closeButton.className = 'sw-winter-dialog__close';
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Закрыть видео');
    closeButton.addEventListener('click', closePlayer);

    error = document.createElement('p');
    error.className = 'sw-winter-dialog__error';
    error.hidden = true;
    error.append('Не удалось воспроизвести видео. ');
    const fallback = document.createElement('a');
    fallback.href = source;
    fallback.target = '_blank';
    fallback.rel = 'noopener';
    fallback.textContent = 'Открыть видео';
    error.append(fallback);
    video.addEventListener('error', () => {
      if (video.hasAttribute('src')) error.hidden = false;
    });

    dialog.append(video, closeButton, error);
    document.body.append(dialog);

    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) closePlayer();
    });

    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closePlayer();
    });
    dialog.addEventListener('close', () => {
      if (!dialog.open) restoreFocus(releasePlayer());
    });
  }

  function releasePlayer() {
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (bodyStyles) {
      document.body.style.overflow = bodyStyles.overflow;
      document.body.style.paddingRight = bodyStyles.paddingRight;
      bodyStyles = null;
    }
    const target = returnFocus;
    returnFocus = null;
    return target;
  }

  function restoreFocus(target) {
    if (target && target.isConnected) target.focus({ preventScroll: true });
  }

  function closePlayer() {
    if (!dialog || !dialog.open) return;
    const target = releasePlayer();
    dialog.close();
    restoreFocus(target);
  }

  function openPlayer(trigger) {
    buildPlayer();
    if (dialog.open) return;
    returnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    bodyStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight
    };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) {
      const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${padding + scrollbar}px`;
    }
    document.body.style.overflow = 'hidden';
    error.hidden = true;
    video.src = source;
    dialog.showModal();
    // A blocked autoplay attempt still leaves the standard controls available.
    const playback = video.play();
    if (playback) playback.catch(() => {});
  }

  function labelTriggers() {
    document.querySelectorAll(triggerSelector).forEach(trigger => {
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-label', 'Посмотреть видео о направляющей, 26 секунд');
    });
  }

  document.addEventListener('click', event => {
    const trigger = event.target instanceof Element ? event.target.closest(triggerSelector) : null;
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    openPlayer(trigger);
  }, true);

  // Tilda and other page widgets may cancel the browser's default Escape action.
  // Handle it before document listeners, and only while this player is open.
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !dialog || !dialog.open) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closePlayer();
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', labelTriggers);
  else labelTriggers();

  window.SpeedwashWinterVideo = {
    open: openPlayer,
    close: closePlayer
  };
})();
