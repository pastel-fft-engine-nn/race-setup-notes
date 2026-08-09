/**
 * ミニ四駆セッティング帳 - メインアプリ
 * iOS風・パステルピンク / 白 / 淡い青
 */

const MOTOR_LIST = [
  'ノーマルPRO',
  'レブチューンPRO',
  'トルクチューンPRO',
  'アトミックチューンPRO',
  'ライトダッシュPRO',
  'ハイパーダッシュPRO',
  'マッハダッシュPRO',
  'ノーマル',
  'レブチューン',
  'トルクチューン',
  'アトミックチューン',
  'ライトダッシュ',
  'ハイパーダッシュ',
  'パワーダッシュ',
  'スプリントダッシュ'
];

// ========== ユーティリティ ==========
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('opacity-0');
  el.classList.add('opacity-100');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove('opacity-100');
    el.classList.add('opacity-0');
  }, ms);
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ========== 状態 ==========
let allRecords = [];
let currentMedia = []; // { id, type, buffer, mime, name, url }

// ========== 初期化 ==========
document.addEventListener('DOMContentLoaded', async () => {
  await loadAndRender();
  bindEvents();
});

async function loadAndRender() {
  try {
    allRecords = await getAllRecords();
    updateFilterOptions();
    renderList();
  } catch (e) {
    console.error(e);
    toast('データ読み込みに失敗しました');
  }
}

function updateFilterOptions() {
  getFilterOptions().then(({ locations, motors }) => {
    const locSel = $('#filter-location');
    const motSel = $('#filter-motor');
    const curLoc = locSel.value;
    const curMot = motSel.value;

    locSel.innerHTML = '<option value="">場所</option>' +
      locations.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
    motSel.innerHTML = '<option value="">モーター</option>' +
      motors.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');

    locSel.value = curLoc;
    motSel.value = curMot;
  });
}

// ========== 一覧描画 ==========
function getFilteredRecords() {
  const cls = $('#filter-class').value;
  const loc = $('#filter-location').value;
  const mot = $('#filter-motor').value;
  const q = ($('#filter-search').value || '').trim().toLowerCase();

  return allRecords.filter(r => {
    if (cls && r.classType !== cls) return false;
    if (loc && r.location !== loc) return false;
    if (mot && r.motorType !== mot) return false;
    if (q) {
      const hay = [r.location, r.motorType, r.memo, r.motorNumber, r.weather].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderList() {
  const list = getFilteredRecords();
  const container = $('#record-list');
  const empty = $('#empty-msg');

  if (list.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  container.innerHTML = list.map(r => {
    const resultBadge = r.result === '完走'
      ? '<span class="badge badge-finish">完走</span>'
      : r.result === 'コースアウト'
        ? '<span class="badge badge-out">コースアウト</span>'
        : '';
    const classBadge = r.classType
      ? `<span class="badge badge-class">${escapeHtml(r.classType)}</span>`
      : '';
    const typeBadge = r.eventType === '大会'
      ? '<span class="badge badge-race">大会</span>'
      : '<span class="badge badge-practice">練習</span>';

    const speed = r.speed != null && r.speed !== '' ? `${r.speed} km/h` : '';
    const temp = r.temperature != null && r.temperature !== '' ? `${r.temperature}℃` : '';

    return `
      <article class="record-card p-4 cursor-pointer" data-id="${r.id}">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="font-semibold text-[15px] text-gray-900">${escapeHtml(formatDate(r.date))}</div>
            <div class="text-[13px] text-gray-400 mt-0.5">${escapeHtml(r.location || '場所未設定')}</div>
          </div>
          <div class="flex flex-wrap gap-1 justify-end">
            ${typeBadge}${classBadge}${resultBadge}
          </div>
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-gray-500">
          ${r.motorType ? `<span>モーター <b class="text-gray-700">${escapeHtml(r.motorType)}</b></span>` : ''}
          ${speed ? `<span>時速 <b class="text-gray-700">${escapeHtml(speed)}</b></span>` : ''}
          ${r.gearRatio ? `<span>ギヤ <b class="text-gray-700">${escapeHtml(r.gearRatio)}</b></span>` : ''}
          ${temp ? `<span>${escapeHtml(temp)}</span>` : ''}
          ${r.weather ? `<span>${escapeHtml(r.weather)}</span>` : ''}
        </div>
        ${r.memo ? `<p class="text-[12px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">${escapeHtml(r.memo)}</p>` : ''}
      </article>
    `;
  }).join('');

  container.querySelectorAll('.record-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

// ========== イベント ==========
function bindEvents() {
  $('#btn-new').addEventListener('click', () => openForm());
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-backdrop').addEventListener('click', closeModal);

  ['filter-class', 'filter-location', 'filter-motor'].forEach(id => {
    $(`#${id}`).addEventListener('change', renderList);
  });
  $('#filter-search').addEventListener('input', () => {
    clearTimeout(bindEvents._st);
    bindEvents._st = setTimeout(renderList, 200);
  });
  $('#btn-clear-filter').addEventListener('click', () => {
    $('#filter-class').value = '';
    $('#filter-location').value = '';
    $('#filter-motor').value = '';
    $('#filter-search').value = '';
    renderList();
  });
}

function closeModal() {
  $('#modal').classList.add('hidden');
  currentMedia.forEach(m => { if (m.url) URL.revokeObjectURL(m.url); });
  currentMedia = [];
}

// ========== フォーム ==========
function openForm(record = null) {
  const isEdit = !!record;
  $('#modal-title').textContent = isEdit ? '記録を編集' : '新規記録';
  currentMedia = [];

  if (record && record.media && record.media.length) {
    record.media.forEach(m => {
      const url = bufferToObjectURL(m.buffer, m.mime);
      currentMedia.push({ ...m, url });
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const motorOptions = MOTOR_LIST.map(m =>
    `<option value="${escapeHtml(m)}" ${record?.motorType === m ? 'selected' : ''}>${escapeHtml(m)}</option>`
  ).join('');

  // スライダー初期値
  const tempVal = record?.temperature != null ? Number(record.temperature) : 25;
  const tireVal = record?.tireDiameter != null ? Number(record.tireDiameter) : 26.0;
  const weightVal = record?.weight != null ? Number(record.weight) : 150.0;
  const voltVal = record?.voltage != null ? Number(record.voltage) : 2.8;
  const speedVal = record?.speed != null ? Number(record.speed) : 30.0;

  const gearOptions = [
    '3.5:1', '3.7:1', '4.0:1', '4.2:1', '5:1', '6.4:1', '8.75:1', '11.2:1'
  ].map(g => `<option value="${g}" ${record?.gearRatio === g ? 'selected' : ''}>${g}</option>`).join('');

  $('#modal-body').innerHTML = `
    <form id="record-form" class="px-4 pb-10">

      <div class="section-title">基本情報</div>
      <div class="form-group">
        <div class="form-row">
          <label class="form-label">日付</label>
          <input type="date" name="date" class="form-control" required value="${escapeHtml(record?.date || today)}" />
        </div>
        <div class="form-row">
          <label class="form-label">練習 / 大会</label>
          <select name="eventType" class="form-control">
            <option value="練習" ${record?.eventType !== '大会' ? 'selected' : ''}>練習</option>
            <option value="大会" ${record?.eventType === '大会' ? 'selected' : ''}>大会</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">場所</label>
          <input type="text" name="location" class="form-control" placeholder="コース名" value="${escapeHtml(record?.location || '')}" />
        </div>
        <div class="form-row">
          <label class="form-label">GPS</label>
          <div class="flex-1 flex items-center justify-end gap-2">
            <span id="gps-status" class="text-[12px] text-gray-400">${record?.lat ? `${Number(record.lat).toFixed(4)}, ${Number(record.lng).toFixed(4)}` : '未取得'}</span>
            <button type="button" id="btn-gps" class="btn-media text-[12px] h-8 px-3">取得</button>
          </div>
          <input type="hidden" name="lat" value="${record?.lat ?? ''}" />
          <input type="hidden" name="lng" value="${record?.lng ?? ''}" />
        </div>
        <div class="form-row">
          <label class="form-label">レーン</label>
          <select name="lanes" class="form-control">
            <option value="">-</option>
            <option value="3" ${record?.lanes === '3' ? 'selected' : ''}>3レーン</option>
            <option value="5" ${record?.lanes === '5' ? 'selected' : ''}>5レーン</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">クラス</label>
          <select name="classType" class="form-control">
            <option value="">-</option>
            <option value="オープン" ${record?.classType === 'オープン' ? 'selected' : ''}>オープン</option>
            <option value="ストック" ${record?.classType === 'ストック' ? 'selected' : ''}>ストック</option>
            <option value="BMAX" ${record?.classType === 'BMAX' ? 'selected' : ''}>BMAX</option>
            <option value="トライアル" ${record?.classType === 'トライアル' ? 'selected' : ''}>トライアル</option>
            <option value="GT" ${record?.classType === 'GT' ? 'selected' : ''}>GT</option>
            <option value="その他" ${record?.classType === 'その他' ? 'selected' : ''}>その他</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">室内 / 室外</label>
          <select name="indoorOutdoor" class="form-control">
            <option value="">-</option>
            <option value="室内" ${record?.indoorOutdoor === '室内' ? 'selected' : ''}>室内</option>
            <option value="室外" ${record?.indoorOutdoor === '室外' ? 'selected' : ''}>室外</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">天気</label>
          <select name="weather" class="form-control">
            <option value="">-</option>
            <option value="快晴" ${record?.weather === '快晴' ? 'selected' : ''}>快晴</option>
            <option value="晴れ" ${record?.weather === '晴れ' ? 'selected' : ''}>晴れ</option>
            <option value="曇" ${record?.weather === '曇' ? 'selected' : ''}>曇</option>
            <option value="雨" ${record?.weather === '雨' ? 'selected' : ''}>雨</option>
          </select>
        </div>
        <div class="form-row form-row-slider">
          <label class="form-label">気温 (℃)</label>
          <div class="slider-wrap">
            <input type="range" name="temperature" class="form-slider" min="0" max="50" step="0.1" value="${tempVal}" data-display="temp-val" />
            <span class="slider-val" id="temp-val">${tempVal.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div class="section-title">マシン</div>
      <div class="form-group">
        <div class="form-row">
          <label class="form-label">モーター</label>
          <select name="motorType" class="form-control">
            <option value="">選択してください</option>
            ${motorOptions}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">モーターNo.</label>
          <input type="text" name="motorNumber" class="form-control" placeholder="識別用" value="${escapeHtml(record?.motorNumber || '')}" />
        </div>
        <div class="form-row">
          <label class="form-label">ギヤ比</label>
          <select name="gearRatio" class="form-control">
            <option value="">-</option>
            ${gearOptions}
          </select>
        </div>
        <div class="form-row form-row-slider">
          <label class="form-label">タイヤ径 (mm)</label>
          <div class="slider-wrap">
            <input type="range" name="tireDiameter" class="form-slider" min="22" max="40" step="0.1" value="${tireVal}" data-display="tire-val" />
            <span class="slider-val" id="tire-val">${tireVal.toFixed(1)}</span>
          </div>
        </div>
        <div class="form-row form-row-slider">
          <label class="form-label">車重 (g)</label>
          <div class="slider-wrap">
            <input type="range" name="weight" class="form-slider" min="70" max="400" step="0.1" value="${weightVal}" data-display="weight-val" />
            <span class="slider-val" id="weight-val">${weightVal.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div class="section-title">電源</div>
      <div class="form-group">
        <div class="form-row">
          <label class="form-label">電池種類</label>
          <select name="batteryType" class="form-control">
            <option value="">-</option>
            <option value="ニッケル水素" ${record?.batteryType === 'ニッケル水素' ? 'selected' : ''}>ニッケル水素</option>
            <option value="リチウムイオン" ${record?.batteryType === 'リチウムイオン' ? 'selected' : ''}>リチウムイオン</option>
            <option value="アルカリ" ${record?.batteryType === 'アルカリ' ? 'selected' : ''}>アルカリ</option>
            <option value="その他" ${record?.batteryType === 'その他' ? 'selected' : ''}>その他</option>
          </select>
        </div>
        <div class="form-row form-row-slider">
          <label class="form-label">電圧 (V)</label>
          <div class="slider-wrap">
            <input type="range" name="voltage" class="form-slider" min="2.0" max="4.0" step="0.1" value="${voltVal}" data-display="volt-val" />
            <span class="slider-val" id="volt-val">${voltVal.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div class="section-title">走行結果</div>
      <div class="form-group">
        <div class="form-row form-row-slider">
          <label class="form-label">時速 (km/h)</label>
          <div class="slider-wrap">
            <input type="range" name="speed" class="form-slider" min="10" max="70" step="0.1" value="${speedVal}" data-display="speed-val" />
            <span class="slider-val" id="speed-val">${speedVal.toFixed(1)}</span>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">回転数 (rpm)</label>
          <input type="number" name="rpm" class="form-control" step="1" placeholder="例 18000" value="${record?.rpm ?? ''}" />
        </div>
        <div class="form-row">
          <label class="form-label"></label>
          <a href="https://pastel-fft-engine-nn.github.io/mini-4wd-rperm/" target="_blank" rel="noopener noreferrer" class="rpm-check-link">回転数を確認する →</a>
        </div>
        <div class="form-row">
          <label class="form-label">結果</label>
          <select name="result" class="form-control">
            <option value="">-</option>
            <option value="完走" ${record?.result === '完走' ? 'selected' : ''}>完走</option>
            <option value="コースアウト" ${record?.result === 'コースアウト' ? 'selected' : ''}>コースアウト</option>
          </select>
        </div>
      </div>

      <div class="section-title">メモ</div>
      <div class="form-group">
        <div class="form-row" style="align-items:flex-start; min-height:auto;">
          <textarea name="memo" class="form-control" placeholder="セッティングのポイントなど">${escapeHtml(record?.memo || '')}</textarea>
        </div>
      </div>

      <div class="section-title">写真・動画</div>
      <div class="form-group p-4">
        <div class="flex flex-wrap gap-2 mb-3" id="media-list"></div>
        <div class="flex flex-wrap gap-2">
          <button type="button" id="btn-photo" class="btn-media">📷 写真を撮る</button>
          <button type="button" id="btn-video" class="btn-media">🎥 動画を撮る</button>
          <button type="button" id="btn-gallery" class="btn-media">🖼️ ライブラリ</button>
        </div>
        <!-- 端末の標準カメラアプリを起動（端末の解像度・設定をそのまま使用） -->
        <input type="file" id="media-photo" accept="image/*" capture="environment" class="hidden" />
        <input type="file" id="media-video" accept="video/*" capture="environment" class="hidden" />
        <input type="file" id="media-gallery" accept="image/*,video/*" multiple class="hidden" />
        <p class="text-[11px] text-gray-400 mt-2 leading-relaxed">
          写真・動画は端末のカメラ設定（画素数・解像度）で撮影されます。<br>
          圧縮せずそのまま保存します（容量の許す限り）。
        </p>
      </div>

      <div class="pt-4 space-y-3">
        <button type="submit" class="btn-primary">${isEdit ? '更新する' : '保存する'}</button>
        ${isEdit ? `<button type="button" id="btn-delete" class="btn-danger">削除する</button>` : ''}
      </div>
    </form>
  `;

  renderMediaList();
  $('#modal').classList.remove('hidden');

  // スライダー値表示の連動
  $$('.form-slider').forEach(slider => {
    const displayId = slider.dataset.display;
    const displayEl = displayId ? document.getElementById(displayId) : null;
    const update = () => {
      if (displayEl) displayEl.textContent = Number(slider.value).toFixed(1);
    };
    slider.addEventListener('input', update);
    update();
  });

  // GPS
  $('#btn-gps').addEventListener('click', getGPS);

  // 端末の標準カメラを起動（端末に設定された画素数・解像度で撮影）
  $('#btn-photo').addEventListener('click', () => $('#media-photo').click());
  $('#btn-video').addEventListener('click', () => $('#media-video').click());
  $('#btn-gallery').addEventListener('click', () => $('#media-gallery').click());

  // 上限を大きめに（高画質の静止画・動画向け）。端末容量依存。
  const MAX_MEDIA_BYTES = 500 * 1024 * 1024; // 500MB

  async function handleFiles(files) {
    for (const file of files) {
      if (file.size > MAX_MEDIA_BYTES) {
        toast('ファイルが大きすぎます（500MBまで）');
        continue;
      }
      // 再エンコードせず、カメラが出したデータをそのまま保存
      const buffer = await fileToArrayBuffer(file);
      const url = bufferToObjectURL(buffer, file.type);
      currentMedia.push({
        id: crypto.randomUUID(),
        type: file.type.startsWith('video') ? 'video' : 'image',
        buffer,
        mime: file.type,
        name: file.name,
        url,
        size: file.size
      });
    }
    renderMediaList();
  }

  $('#media-photo').addEventListener('change', async (e) => {
    await handleFiles(Array.from(e.target.files || []));
    e.target.value = '';
  });
  $('#media-video').addEventListener('change', async (e) => {
    await handleFiles(Array.from(e.target.files || []));
    e.target.value = '';
  });
  $('#media-gallery').addEventListener('change', async (e) => {
    await handleFiles(Array.from(e.target.files || []));
    e.target.value = '';
  });

  if (isEdit) {
    $('#btn-delete').addEventListener('click', async () => {
      if (!confirm('この記録を削除しますか？')) return;
      await deleteRecord(record.id);
      toast('削除しました');
      closeModal();
      await loadAndRender();
    });
  }

  $('#record-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());

    ['temperature', 'tireDiameter', 'weight', 'voltage', 'speed', 'rpm', 'lat', 'lng'].forEach(k => {
      if (data[k] === '' || data[k] == null) data[k] = null;
      else data[k] = Number(data[k]);
    });

    const recordData = {
      ...(record || {}),
      ...data,
      media: currentMedia.map(m => ({
        id: m.id,
        type: m.type,
        buffer: m.buffer,
        mime: m.mime,
        name: m.name
      }))
    };

    try {
      await saveRecord(recordData);
      toast(isEdit ? '更新しました' : '保存しました');
      closeModal();
      await loadAndRender();
    } catch (err) {
      console.error(err);
      toast('保存に失敗しました');
    }
  });
}

function renderMediaList() {
  const el = $('#media-list');
  if (!el) return;
  el.innerHTML = currentMedia.map((m, i) => `
    <div class="media-preview">
      ${m.type === 'video'
        ? `<video src="${m.url}" class="w-full h-full object-cover"></video>`
        : `<img src="${m.url}" alt="" />`}
      <button type="button" class="remove-btn" data-idx="${i}">×</button>
    </div>
  `).join('');

  el.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      if (currentMedia[idx]?.url) URL.revokeObjectURL(currentMedia[idx].url);
      currentMedia.splice(idx, 1);
      renderMediaList();
    });
  });
}

function getGPS() {
  const status = $('#gps-status');
  if (!navigator.geolocation) {
    status.textContent = '非対応';
    return;
  }
  status.textContent = '取得中...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      $('input[name="lat"]').value = latitude;
      $('input[name="lng"]').value = longitude;
      status.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      toast('位置を取得しました');
    },
    () => {
      status.textContent = '取得失敗';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ========== 詳細表示 ==========
async function openDetail(id) {
  const record = await getRecord(id);
  if (!record) {
    toast('記録が見つかりません');
    return;
  }

  const mediaItems = (record.media || []).map(m => ({
    ...m,
    url: bufferToObjectURL(m.buffer, m.mime)
  }));
  currentMedia = mediaItems;

  $('#modal-title').textContent = '記録詳細';

  const rows = [
    ['日付', formatDate(record.date)],
    ['場所', record.location || '-'],
    ['練習/大会', record.eventType || '-'],
    ['レーン', record.lanes ? record.lanes + 'レーン' : '-'],
    ['クラス', record.classType || '-'],
    ['室内/室外', record.indoorOutdoor || '-'],
    ['天気', record.weather || '-'],
    ['気温', record.temperature != null ? record.temperature + ' ℃' : '-'],
    ['モーター', record.motorType || '-'],
    ['モーターNo.', record.motorNumber || '-'],
    ['ギヤ比', record.gearRatio || '-'],
    ['タイヤ径', record.tireDiameter != null ? record.tireDiameter + ' mm' : '-'],
    ['車重', record.weight != null ? record.weight + ' g' : '-'],
    ['電池', record.batteryType || '-'],
    ['電圧', record.voltage != null ? record.voltage + ' V' : '-'],
    ['時速', record.speed != null ? record.speed + ' km/h' : '-'],
    ['回転数', record.rpm != null ? record.rpm + ' rpm' : '-'],
    ['結果', record.result || '-'],
  ];

  $('#modal-body').innerHTML = `
    <div class="px-4 pb-10">
      <div class="section-title">詳細</div>
      <div class="form-group">
        ${rows.map(([k, v]) => `
          <div class="detail-row">
            <span class="detail-label">${k}</span>
            <span class="detail-value">${escapeHtml(String(v))}</span>
          </div>
        `).join('')}
      </div>

      ${record.memo ? `
        <div class="section-title">メモ</div>
        <div class="form-group p-4">
          <p class="text-[15px] leading-relaxed whitespace-pre-wrap text-gray-700">${escapeHtml(record.memo)}</p>
        </div>
      ` : ''}

      ${mediaItems.length ? `
        <div class="section-title">写真・動画</div>
        <div class="form-group p-4">
          <div class="grid grid-cols-2 gap-2">
            ${mediaItems.map(m => m.type === 'video'
              ? `<video src="${m.url}" controls class="w-full rounded-xl bg-black"></video>`
              : `<img src="${m.url}" class="w-full rounded-xl object-cover max-h-48" alt="" />`
            ).join('')}
          </div>
        </div>
      ` : ''}

      <div class="pt-4">
        <button type="button" id="btn-edit" class="btn-primary">編集する</button>
      </div>
    </div>
  `;

  $('#modal').classList.remove('hidden');

  $('#btn-edit').addEventListener('click', () => {
    openForm(record);
  });
}
