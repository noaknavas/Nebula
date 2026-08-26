import i18next from 'i18next';
import { setTheme } from 'mdui/functions/setTheme.js';
import 'mdui/mdui.css';
import 'mdui';

import { loadI18n, setLanguage, t as i18t } from '@/i18n';
import {
  defaultTrustedTypePolicy,
  registerWindowDefaultTrustedTypePolicy,
} from '@/utils/trusted-types';

import {
  createContext,
  forceLoadRendererPlugin,
  forceUnloadRendererPlugin,
  getAllLoadedRendererPlugins,
  getLoadedRendererPlugin,
  loadAllRendererPlugins,
} from './loader/renderer';
import { startingPages } from './providers/extracted-data';
import { setupSongInfo } from './providers/song-info-front';

import type { MusicPlayer } from '@/types/music-player';
import type { MusicPlayerAppElement } from '@/types/music-player-app-element';
import type { QueueResponse } from '@/types/music-player-desktop-internal';
import type { PluginConfig } from '@/types/plugins';
import type { QueueElement } from '@/types/queue';
import type { SearchBoxElement } from '@/types/search-box-element';

setTheme('dark');

let api: (Element & MusicPlayer) | null = null;
let isPluginLoaded = false;
let isApiLoaded = false;
let firstDataLoaded = false;

registerWindowDefaultTrustedTypePolicy();

async function listenForApiLoad() {
  if (!isApiLoaded) {
    api = document.querySelector('#movie_player');
    if (api) {
      await onApiLoaded();

      return;
    }
  }
}

async function onApiLoaded() {
  // Workaround for macOS traffic lights
  {
    let osType = 'Unknown';
    if (window.electronIs.osx()) {
      osType = 'Macintosh';
    } else if (window.electronIs.windows()) {
      osType = 'Windows';
    } else if (window.electronIs.linux()) {
      osType = 'Linux';
    }
    document.documentElement.setAttribute('data-os', osType);
  }

  // Workaround for #2459
  document
    .querySelector('button.video-button.ytmusic-av-toggle')
    ?.addEventListener('click', () =>
      window.dispatchEvent(new Event('resize')),
    );

  window.ipcRenderer.on('peard:previous-video', () => {
    document
      .querySelector<HTMLElement>('.previous-button.ytmusic-player-bar')
      ?.click();
  });
  window.ipcRenderer.on('peard:next-video', () => {
    document
      .querySelector<HTMLElement>('.next-button.ytmusic-player-bar')
      ?.click();
  });
  window.ipcRenderer.on('peard:play', (_) => {
    api?.playVideo();
  });
  window.ipcRenderer.on('peard:pause', (_) => {
    api?.pauseVideo();
  });
  window.ipcRenderer.on('peard:toggle-play', (_) => {
    if (api?.getPlayerState() === 2) api?.playVideo();
    else api?.pauseVideo();
  });
  window.ipcRenderer.on('peard:seek-to', (_, t: number) => api!.seekTo(t));
  window.ipcRenderer.on('peard:seek-by', (_, t: number) => api!.seekBy(t));
  window.ipcRenderer.on('peard:shuffle', () => {
    document
      .querySelector<HTMLElement & { queue: { shuffle: () => void } }>(
        'ytmusic-player-bar',
      )
      ?.queue.shuffle();
  });

  const isShuffled = () => {
    const isShuffled =
      document
        .querySelector<HTMLElement>('ytmusic-player-bar')
        ?.attributes.getNamedItem('shuffle-on') ?? null;

    return isShuffled !== null;
  };

  window.ipcRenderer.on('peard:get-shuffle', () => {
    window.ipcRenderer.send('peard:get-shuffle-response', isShuffled());
  });

  window.ipcRenderer.on(
    'peard:update-like',
    (_, status: 'LIKE' | 'DISLIKE' = 'LIKE') => {
      document
        .querySelector<
          HTMLElement & { updateLikeStatus: (status: string) => void }
        >('#like-button-renderer')
        ?.updateLikeStatus(status);
    },
  );
  window.ipcRenderer.on('peard:switch-repeat', (_, repeat = 1) => {
    for (let i = 0; i < repeat; i++) {
      document
        .querySelector<HTMLElement & { onRepeatButtonClick: () => void }>(
          'ytmusic-player-bar',
        )
        ?.onRepeatButtonClick();
    }
  });
  window.ipcRenderer.on('peard:update-volume', (_, volume: number) => {
    document
      .querySelector<HTMLElement & { updateVolume: (volume: number) => void }>(
        'ytmusic-player-bar',
      )
      ?.updateVolume(volume);
  });

  const isFullscreen = () => {
    const isFullscreen =
      document
        .querySelector<HTMLElement>('ytmusic-player-bar')
        ?.attributes.getNamedItem('player-fullscreened') ?? null;

    return isFullscreen !== null;
  };

  const clickFullscreenButton = (isFullscreenValue: boolean) => {
    const fullscreen = isFullscreen();
    if (isFullscreenValue === fullscreen) {
      return;
    }

    if (fullscreen) {
      document.querySelector<HTMLElement>('.exit-fullscreen-button')?.click();
    } else {
      document.querySelector<HTMLElement>('.fullscreen-button')?.click();
    }
  };

  window.ipcRenderer.on('peard:get-fullscreen', () => {
    window.ipcRenderer.send('peard:set-fullscreen', isFullscreen());
  });

  window.ipcRenderer.on(
    'peard:click-fullscreen-button',
    (_, fullscreen: boolean | undefined) => {
      clickFullscreenButton(fullscreen ?? false);
    },
  );

  window.ipcRenderer.on('peard:toggle-mute', (_) => {
    document
      .querySelector<HTMLElement & { onVolumeClick: () => void }>(
        'ytmusic-player-bar',
      )
      ?.onVolumeClick();
  });

  window.ipcRenderer.on('peard:get-queue', () => {
    const queue = document.querySelector<QueueElement>('#queue');
    window.ipcRenderer.send('peard:get-queue-response', {
      items: queue?.queue.getItems(),
      autoPlaying: queue?.queue.autoPlaying,
      continuation: queue?.queue.continuation,
    } satisfies QueueResponse);
  });

  window.ipcRenderer.on(
    'peard:add-to-queue',
    (_, videoId: string, queueInsertPosition: string) => {
      const queue = document.querySelector<QueueElement>('#queue');
      const app = document.querySelector<MusicPlayerAppElement>('ytmusic-app');
      if (!app) return;

      const store = queue?.queue.store.store;
      if (!store) return;

      app.networkManager
        .fetch('/music/get_queue', {
          queueContextParams: store.getState().queue.queueContextParams,
          queueInsertPosition,
          videoIds: [videoId],
        })
        .then((result) => {
          if (
            result &&
            typeof result === 'object' &&
            'queueDatas' in result &&
            Array.isArray(result.queueDatas)
          ) {
            const queueItems = store.getState().queue.items;
            const queueItemsLength = queueItems.length ?? 0;
            queue?.dispatch({
              type: 'ADD_ITEMS',
              payload: {
                nextQueueItemId: store.getState().queue.nextQueueItemId,
                index:
                  queueInsertPosition === 'INSERT_AFTER_CURRENT_VIDEO'
                    ? queueItems.findIndex(
                        (it) =>
                          (
                            it.playlistPanelVideoRenderer ||
                            it.playlistPanelVideoWrapperRenderer
                              ?.primaryRenderer.playlistPanelVideoRenderer
                          )?.selected,
                      ) + 1 || queueItemsLength
                    : queueItemsLength,
                items: result.queueDatas
                  .map((it) =>
                    typeof it === 'object' && it && 'content' in it
                      ? it.content
                      : null,
                  )
                  .filter(Boolean),
                shuffleEnabled: false,
                shouldAssignIds: true,
              },
            });
          }
        });
    },
  );
  window.ipcRenderer.on(
    'peard:move-in-queue',
    (_, fromIndex: number, toIndex: number) => {
      const queue = document.querySelector<QueueElement>('#queue');
      queue?.dispatch({
        type: 'MOVE_ITEM',
        payload: {
          fromIndex,
          toIndex,
        },
      });
    },
  );
  window.ipcRenderer.on('peard:remove-from-queue', (_, index: number) => {
    const queue = document.querySelector<QueueElement>('#queue');
    queue?.dispatch({
      type: 'REMOVE_ITEM',
      payload: index,
    });
  });
  window.ipcRenderer.on('peard:set-queue-index', (_, index: number) => {
    const queue = document.querySelector<QueueElement>('#queue');
    queue?.dispatch({
      type: 'SET_INDEX',
      payload: index,
    });
  });
  window.ipcRenderer.on('peard:clear-queue', () => {
    const queue = document.querySelector<QueueElement>('#queue');
    queue?.queue.store.store.dispatch({
      type: 'SET_PLAYER_PAGE_INFO',
      payload: { open: false },
    });
    queue?.dispatch({
      type: 'CLEAR',
    });
  });

  window.ipcRenderer.on(
    'peard:search',
    async (_, query: string, params?: string, continuation?: string) => {
      const app = document.querySelector<MusicPlayerAppElement>('ytmusic-app');
      const searchBox =
        document.querySelector<SearchBoxElement>('ytmusic-search-box');

      if (!app || !searchBox) return;

      const result = await app.networkManager.fetch<
        unknown,
        {
          query: string;
          params?: string;
          continuation?: string;
          suggestStats?: unknown;
        }
      >('/search', {
        query,
        params,
        continuation,
        suggestStats: searchBox.getSearchboxStats(),
      });

      window.ipcRenderer.send('peard:search-results', result);
    },
  );

  const video = document.querySelector('video')!;
  const audioContext = new AudioContext();
  const audioSource = audioContext.createMediaElementSource(video);
  audioSource.connect(audioContext.destination);

  for (const [id, plugin] of Object.entries(getAllLoadedRendererPlugins())) {
    if (typeof plugin.renderer !== 'function') {
      await plugin.renderer?.onPlayerApiReady?.call(
        plugin.renderer,
        api!,
        createContext(id),
      );
    }
  }

  if (firstDataLoaded) {
    document.dispatchEvent(
      new CustomEvent('videodatachange', { detail: { name: 'dataloaded' } }),
    );
  }

  const audioCanPlayEventDispatcher = () => {
    document.dispatchEvent(
      new CustomEvent('peard:audio-can-play', {
        detail: {
          audioContext,
          audioSource,
        },
      }),
    );
  };

  const loadstartListener = () => {
    // Emit "audioCanPlay" for each video
    video.addEventListener('canplaythrough', audioCanPlayEventDispatcher, {
      once: true,
    });
  };

  if (video.readyState === 4 /* HAVE_ENOUGH_DATA (loaded) */) {
    audioCanPlayEventDispatcher();
  }

  video.addEventListener('loadstart', loadstartListener, { passive: true });

  window.ipcRenderer.send('peard:player-api-loaded');

  // Navigate to "Starting page"
  const startingPage: string = window.mainConfig.get('options.startingPage');
  if (startingPage && startingPages[startingPage]) {
    document
      .querySelector<MusicPlayerAppElement>('ytmusic-app')
      ?.navigate(startingPages[startingPage]);
  }

  // Remove upgrade button
  if (window.mainConfig.get('options.removeUpgradeButton')) {
    const itemsSelector = 'ytmusic-guide-section-renderer #items';
    let selector = 'ytmusic-guide-entry-renderer:last-child';

    const upgradeBtnIcon = document.querySelector<SVGGElement>(
      'iron-iconset-svg[name="yt-sys-icons"] #\u0079\u006f\u0075\u0074\u0075\u0062\u0065_music_monochrome',
    );
    if (upgradeBtnIcon) {
      const path = upgradeBtnIcon.firstChild as SVGPathElement;
      const data = path.getAttribute('d')!.substring(0, 15);
      selector = `ytmusic-guide-entry-renderer:has(> tp-yt-paper-item > yt-icon path[d^="${data}"])`;
    }

    const styles = document.createElement('style');
    styles.textContent = `${itemsSelector} ${selector} { display: none; }`;

    document.head.appendChild(styles);
  }

  // Hide / Force show like buttons
  const likeButtonsOptions: string = window.mainConfig.get(
    'options.likeButtons',
  );
  if (likeButtonsOptions) {
    const style = document.createElement('style');
    style.textContent = `
      ytmusic-player-bar[is-mweb-player-bar-modernization-enabled] .middle-controls-buttons.ytmusic-player-bar, #like-button-renderer {
        display: ${
          likeButtonsOptions === 'hide' ? 'none' : 'inherit'
        } !important;
      }
      ytmusic-player-bar[is-mweb-player-bar-modernization-enabled] .middle-controls.ytmusic-player-bar {
        justify-content: ${
          likeButtonsOptions === 'hide' ? 'flex-start' : 'space-between'
        } !important;
      }`;

    document.head.appendChild(style);
  }

  // Swap like button order
  if (window.mainConfig.get('options.swapLikeButtonsOrder')) {
    const style = document.createElement('style');
    style.textContent = `
      #like-button-renderer {
        display: inline-flex;
        flex-direction: row-reverse;
      }`;

    document.head.appendChild(style);
  }
}

const definePearTransElements = () => {
  customElements.define(
    'pear-trans',
    class extends HTMLElement {
      connectedCallback() {
        const key = this.getAttribute('key');
        if (key) {
          const targetHtml = i18t(key);
          (this.innerHTML as string | TrustedHTML) = defaultTrustedTypePolicy
            ? defaultTrustedTypePolicy.createHTML(targetHtml)
            : targetHtml;
        }
      }
    },
  );
};

const preload = async () => {
  await loadI18n();
  await setLanguage(window.mainConfig.get('options.language') ?? 'en');
  window.i18n = {
    t: i18t.bind(i18next),
  };
  definePearTransElements();
  if (document.body?.dataset?.os) {
    document.body.dataset.os = navigator.userAgent;
  }
};

const main = async () => {
  await loadAllRendererPlugins();
  isPluginLoaded = true;

  window.ipcRenderer.on('plugin:unload', async (_event, id: string) => {
    await forceUnloadRendererPlugin(id);
  });
  window.ipcRenderer.on('plugin:enable', async (_event, id: string) => {
    await forceLoadRendererPlugin(id);
    if (api) {
      const plugin = getLoadedRendererPlugin(id);
      if (plugin && typeof plugin.renderer !== 'function') {
        await plugin.renderer?.onPlayerApiReady?.call(
          plugin.renderer,
          api,
          createContext(id),
        );
      }
    }
  });

  window.ipcRenderer.on(
    'config-changed',
    (_event, id: string, newConfig: PluginConfig) => {
      const plugin = getAllLoadedRendererPlugins()[id];
      if (plugin && typeof plugin.renderer !== 'function') {
        plugin.renderer?.onConfigChange?.call(plugin.renderer, newConfig);
      }
    },
  );

  // Wait for complete load of the api
  await listenForApiLoad();

  // Blocks the "Are You Still There?" popup by setting the last active time to Date.now every 15min
  setInterval(() => (window._lact = Date.now()), 900_000);

  // Setup back to front logger
  if (window.electronIs.dev()) {
    window.ipcRenderer.on('log', (_event, log: string) => {
      console.log(JSON.parse(log));
    });
  }
};

const initObserver = async () => {
  // check document.documentElement is ready
  await new Promise<void>((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve(), {
        once: true,
      });
    } else {
      resolve();
    }
  });

  const observer = new MutationObserver(() => {
    const playerApi = document.querySelector<Element & MusicPlayer>(
      '#movie_player',
    );
    if (playerApi) {
      observer.disconnect();

      // Inject song-info provider
      setupSongInfo(playerApi);
      const dataLoadedListener = (name: string) => {
        if (!firstDataLoaded && name === 'dataloaded') {
          firstDataLoaded = true;
          playerApi.removeEventListener('videodatachange', dataLoadedListener);
        }
      };
      playerApi.addEventListener('videodatachange', dataLoadedListener);

      if (isPluginLoaded && !isApiLoaded) {
        api = playerApi;
        isApiLoaded = true;

        onApiLoaded();
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
};

initObserver().then(preload).then(main);

// ═══════════════ NEBULA CORE INJECTION ═══════════════
const applyNebulaCore = () => {
  const css = `
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.25); border-radius: 999px; transition: background 0.3s; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(139, 92, 246, 0.5); }
    ::-webkit-scrollbar-corner { background: transparent; }
    ytmusic-two-row-item-renderer { transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important; border-radius: 8px; }
    ytmusic-two-row-item-renderer:hover { transform: translateY(-4px) scale(1.02) !important; z-index: 5; }
    ytmusic-two-row-item-renderer #thumbnail-overlay, ytmusic-two-row-item-renderer .image-wrapper img { transition: transform 0.3s !important; }
    ytmusic-two-row-item-renderer:hover .image-wrapper img { transform: scale(1.05) !important; }
    ytmusic-responsive-list-item-renderer { transition: background-color 0.2s ease !important; border-radius: 8px !important; }
    ytmusic-responsive-list-item-renderer:hover { background-color: rgba(255, 255, 255, 0.05) !important; }
    .play-pause-button, .next-button, .previous-button, .like-button-renderer { transition: transform 0.15s !important; }
    .play-pause-button:hover, .next-button:hover, .previous-button:hover { transform: scale(1.15) !important; }
    html, body, ytmusic-app { width: 100% !important; margin-left: 0 !important; }
    tp-yt-app-drawer, ytmusic-mini-guide-renderer, ytmusic-guide-renderer { margin-top: var(--menu-bar-height, 0px) !important; height: calc(100vh - var(--menu-bar-height, 0px)) !important; }
    ytmusic-app-layout > [slot='nav-bar'] { border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important; box-shadow: none !important; }
    #nav-bar-background { background: rgba(10, 10, 15, 0.95) !important; }
    #guide-wrapper { border-right: 1px solid rgba(255, 255, 255, 0.08) !important; }
    
    /* Fade out the bottom of the immersive background photo */
    ytmusic-immersive-header-renderer #background {
        -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
        mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
    }
    ytmusic-immersive-header-renderer .image-gradient {
        background: linear-gradient(to bottom, transparent 0%, #000 100%) !important;
    }
    body:has(ytmusic-player[player-ui-state='FULLSCREEN']) #nebula-sidebar-wrapper, :fullscreen #nebula-sidebar-wrapper { display: none !important; }
    
    /* Spotify Layout Fixes */
    html.spotify #main, html.spotify #root {
        margin-top: var(--menu-bar-height, 32px) !important;
        height: calc(100vh - var(--menu-bar-height, 32px)) !important;
        overflow: hidden !important;
    }
    
    #nebula-sidebar-wrapper {
      position: fixed; top: var(--menu-bar-height, 32px); left: 0; width: 15px; height: calc(100vh - var(--menu-bar-height, 32px)); z-index: 99999999;
      background: transparent;
      transition: width 0.3s;
    }
    #nebula-sidebar-wrapper.open {
      width: 70px;
    }
    #nebula-sidebar { 
      position: absolute; top: 0; left: 0; width: 60px; height: 100%; 
      background: rgba(10, 10, 15, 0.4); backdrop-filter: blur(16px); 
      border-right: 1px solid rgba(255, 255, 255, 0.05); 
      display: flex; flex-direction: column; align-items: center; 
      padding-top: 20px; gap: 12px; 
      transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #nebula-sidebar-wrapper.open #nebula-sidebar { transform: translateX(0); }
    
    .nebula-service-btn {
      width: 44px; height: 44px; border-radius: 12px; margin-bottom: 12px;
      background: rgba(255,255,255,0.05); border: none; cursor: pointer;
      display: flex; justify-content: center; align-items: center;
      transition: all 0.2s;
    }
    .nebula-service-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }
    .nebula-service-btn.active { background: rgba(255,255,255,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); }
    .nebula-service-btn svg { width: 24px; height: 24px; fill: white; opacity: 0.7; }
    .nebula-service-btn:hover svg, .nebula-service-btn.active svg { opacity: 1; }
    .nebula-service-btn.ytm.active svg { fill: #ff0000; }
    .nebula-service-btn.spotify.active svg { fill: #1db954; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  if (window.location.hostname.includes('spotify.com')) {
    document.documentElement.classList.add('spotify');
    
    // Guard against duplicate execution (applyNebulaCore can fire twice)
    if (!document.getElementById('nebula-spotify-adblock')) {
      const style = document.createElement('style');
      style.id = 'nebula-spotify-adblock';
      style.textContent = `
        /* ══════ Premium / Upgrade upsells ══════ */
        [data-testid="upgrade-button"],
        [data-testid="premium-button"],
        [data-testid="upgrade-cta"],
        [data-testid="hpto-container"],
        [data-testid="advertisement"],
        [data-testid="ad-slot-container"],
        .LeaderboardAd,
        a[href*="/premium"],
        a[href*="spotify.com/premium"],
        button[aria-label*="Upgrade"],
        button[aria-label*="upgrade"],
        button[aria-label*="Premium"],
        button[aria-label*="premium"],
        .upgrade-button,
        [class*="UpgradeButton"],
        [class*="upgrade-button"],
        [class*="UpgradeCTA"],
        [class*="upgrade-cta"],
        .premium-cta,
        [data-encore-id="buttonPrimary"][href*="premium"],
        .sponsor-container,

        /* ══════ Download / Install app promos ══════ */
        a[href*="/download"],
        a[href*="spotify.com/download"],
        a[href*="play.google.com"],
        a[href*="apps.apple.com"],
        button[aria-label*="Install"],
        button[aria-label*="install"],
        button[aria-label*="Download"],
        button[aria-label*="download"],
        button[aria-label*="Get the app"],
        [data-testid="install-app-button"],
        [data-testid="download-app-button"],
        [data-testid="smart-banner"],
        [data-testid="download-cta"],
        [class*="InstallButton"],
        [class*="install-button"],
        [class*="DownloadButton"],
        [class*="download-button"],
        [class*="SmartBanner"],
        [class*="smart-banner"],
        [class*="AppBanner"],
        [class*="app-banner"],
        [class*="GetApp"],
        [class*="get-app"],

        /* ══════ Connect device bar ══════ */
        [data-testid="connect-bar"],
        [data-testid="device-picker-bar"],
        [class*="ConnectBar"],
        [class*="connect-bar"],

        /* ══════ Popup notifications & modals ══════ */
        [data-testid="promo-popup"],
        [data-testid="notification-popup"],
        [class*="PromoPopup"],
        [class*="promo-popup"],
        [class*="BottomSheet"][class*="download"],
        [class*="BottomSheet"][class*="premium"],
        [class*="BottomSheet"][class*="upgrade"],

        /* ══════ Generic promotional containers ══════ */
        [class*="promotional"],
        [class*="Promotional"],
        [data-testid*="promotional"],
        [class*="AdsContainer"],
        [class*="ads-container"],
        [class*="AdSlot"],
        [class*="ad-slot"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);

      // MutationObserver: continuously nuke any dynamically injected promos
      const promoKeywords = /download|install|upgrade|premium|get.the.app|try.free|go.premium|get.premium|open.in.app/i;
      const nukePromos = () => {
        // Kill any banner/popup with download/install/premium text
        document.querySelectorAll('[role="banner"], [role="dialog"], [role="alert"], [role="alertdialog"]').forEach(el => {
          const text = (el as HTMLElement).innerText || '';
          if (promoKeywords.test(text) && text.length < 300) {
            (el as HTMLElement).style.display = 'none';
          }
        });
        // Kill bottom-anchored floating bars (cookie banners, download bars)
        document.querySelectorAll('[style*="position: fixed"][style*="bottom"]').forEach(el => {
          const text = (el as HTMLElement).innerText || '';
          if (promoKeywords.test(text)) {
            (el as HTMLElement).style.display = 'none';
          }
        });
      };
      // Check for dynamically injected promos every 3 seconds (lightweight)
      setInterval(() => nukePromos(), 3000);
      nukePromos();

      let isMutedForAd = false;
      setInterval(() => {
        // Language-independent ad detection: check for ad DOM elements
        // and short track duration (ads are always ≤ 30s)
        const adElement = document.querySelector('[data-testid="advertisement"]');
        const progressBar = document.querySelector('[data-testid="playback-progressbar"]');
        const durationEl = document.querySelector('[data-testid="playback-duration"]');
        const duration = durationEl?.textContent?.trim() || '';
        
        // Parse duration like "0:15" or "0:30" — ads are always short
        const durationParts = duration.split(':');
        const totalSeconds = durationParts.length === 2 
          ? parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]) 
          : 999;
        const isShortTrack = totalSeconds > 0 && totalSeconds <= 30;
        
        const isAd = !!adElement || (isShortTrack && !document.querySelector('[data-testid="nowplaying-track-link"] a'));
        const muteBtn = document.querySelector('[data-testid="volume-bar-toggle-mute-button"]');
        
        if (!muteBtn) return;
        
        const mediaEl = document.querySelector('video, audio') as HTMLMediaElement;
        const isCurrentlyMuted = mediaEl ? (mediaEl.muted || mediaEl.volume === 0) : muteBtn.getAttribute('aria-label')?.toLowerCase().includes('unmute');
        
        if (isAd && !isMutedForAd) {
          if (!isCurrentlyMuted) (muteBtn as HTMLElement).click();
          isMutedForAd = true;
        } else if (!isAd && isMutedForAd) {
          if (isCurrentlyMuted) (muteBtn as HTMLElement).click();
          isMutedForAd = false;
        }
      }, 1000);
    }
  }

  if (!document.getElementById('nebula-sidebar-wrapper')) {
    const wrapper = document.createElement('div');
    wrapper.id = 'nebula-sidebar-wrapper';
    
    const sidebar = document.createElement('div');
    sidebar.id = 'nebula-sidebar';
    sidebar.innerHTML = `
      <div class="nebula-service-btn ytm active" title="YouTube Music" data-service="youtube">
        <svg viewBox="0 0 24 24"><path d="M21.58,7.19c-0.23-0.86-0.91-1.54-1.77-1.77C18.25,5,12,5,12,5s-6.25,0-7.81,0.42 c-0.86,0.23-1.54,0.91-1.77,1.77C2,8.75,2,12,2,12s0,3.25,0.42,4.81c0.23,0.86,0.91,1.54,1.77,1.77C5.75,19,12,19,12,19 s6.25,0,7.81-0.42c0.86-0.23,1.54-0.91,1.77-1.77C22,15.25,22,12,22,12S22,8.75,21.58,7.19z M10,15.5v-7l6.5,3.5L10,15.5z"/></svg>
      </div>
      <div class="nebula-service-btn spotify" title="Spotify" data-service="spotify">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.6 14.4c-.2.3-.5.4-.8.2-2.1-1.3-4.8-1.6-8-.9-.3.1-.7-.1-.8-.4-.1-.3.1-.7.4-.8 3.5-.8 6.5-.4 8.9 1.1.3.2.4.5.3.8zm1.2-2.7c-.2.4-.7.5-1 .3-2.5-1.5-6.3-2-8.7-1.1-.4.1-.8-.1-1-.5-.1-.4.1-.8.5-1 2.8-1 7.1-.5 10 1.3.4.2.5.6.2 1zm.1-2.9c-3-1.8-7.9-2-10.7-1.1-.5.1-1-.2-1.1-.7-.1-.5.2-1 .7-1.1 3.2-1 8.8-.7 12.2 1.3.5.3.6.8.3 1.2-.2.5-.8.7-1.4.4z"/></svg>
      </div>
    `;
    wrapper.appendChild(sidebar);
    document.body.appendChild(wrapper);

    let hoverTimeout: NodeJS.Timeout;
    wrapper.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
      wrapper.classList.add('open');
    });
    wrapper.addEventListener('mouseleave', () => {
      hoverTimeout = setTimeout(() => {
        wrapper.classList.remove('open');
      }, 300); // 300ms grace period before closing
    });

    const buttons = wrapper.querySelectorAll('.nebula-service-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.ipcRenderer.send('switch-service', btn.getAttribute('data-service'));
      });
    });
  }
};
document.addEventListener('DOMContentLoaded', applyNebulaCore);
// In case DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') applyNebulaCore();
