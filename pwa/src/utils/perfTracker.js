const state = {
  loginStartTs: null,
  loginEndTs: null,
  loginTiming: null,
  dashboardMountTs: null,
  bootstrapStartTs: null,
  reportedThisLogin: false,
};

function readServerTimingFor(pathFragment) {
  try {
    const entries = performance.getEntriesByType('resource');
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.name && entry.name.includes(pathFragment)) {
        const result = { totalMs: Math.round(entry.duration), dbMs: null, appMs: null, desc: null };
        if (Array.isArray(entry.serverTiming)) {
          for (const st of entry.serverTiming) {
            if (st.name === 'db') {
              result.dbMs = Math.round(st.duration * 10) / 10;
              result.desc = st.description || null;
            } else if (st.name === 'app') {
              result.appMs = Math.round(st.duration * 10) / 10;
            }
          }
        }
        return result;
      }
    }
  } catch (e) {}
  return null;
}

export function markLoginStart() {
  state.loginStartTs = performance.now();
  state.loginEndTs = null;
  state.loginTiming = null;
  state.dashboardMountTs = null;
  state.bootstrapStartTs = null;
  state.reportedThisLogin = false;
}

export function markLoginApiDone() {
  if (state.loginStartTs == null) return;
  state.loginEndTs = performance.now();
  state.loginTiming = readServerTimingFor('/api/v1/auth/login');
}

export function markDashboardMounted() {
  if (state.dashboardMountTs == null) {
    state.dashboardMountTs = performance.now();
  }
}

export function markBootstrapStart() {
  state.bootstrapStartTs = performance.now();
}

export function markBootstrapDone(studentCount = 0) {
  const now = performance.now();
  const bootstrapMs = state.bootstrapStartTs != null ? Math.round(now - state.bootstrapStartTs) : null;
  const bootServer = readServerTimingFor('/api/v1/coaches/bootstrap');

  if (state.loginStartTs != null && !state.reportedThisLogin) {
    state.reportedThisLogin = true;
    const loginMs = state.loginEndTs != null ? Math.round(state.loginEndTs - state.loginStartTs) : null;
    const chunkMountMs =
      state.loginEndTs != null && state.dashboardMountTs != null
        ? Math.max(0, Math.round(state.dashboardMountTs - state.loginEndTs))
        : null;
    const totalMs = Math.round(now - state.loginStartTs);

    const rows = [
      {
        Etapa: '1. POST /auth/login',
        Total_ms: loginMs,
        Server_ms: state.loginTiming?.appMs ?? '-',
        DB_ms: state.loginTiming?.dbMs ?? '-',
        Detalle: state.loginTiming?.desc || '-',
      },
      {
        Etapa: '2. JS + Montaje Dashboard',
        Total_ms: chunkMountMs,
        Server_ms: '-',
        DB_ms: '-',
        Detalle: 'Chunk React',
      },
      {
        Etapa: '3. GET /coaches/bootstrap',
        Total_ms: bootstrapMs,
        Server_ms: bootServer?.appMs ?? '-',
        DB_ms: bootServer?.dbMs ?? '-',
        Detalle: `${studentCount} alumnos${bootServer?.desc ? ` (${bootServer.desc})` : ''}`,
      },
      {
        Etapa: 'TOTAL (Click -> Listo)',
        Total_ms: totalMs,
        Server_ms: '-',
        DB_ms: '-',
        Detalle: 'Hasta ver Alumnos',
      },
    ];
    console.log('%c[Syncro Perf] Tiempos de Inicio de Sesión', 'color:#10b981;font-weight:bold;');
    console.table(rows);
  } else if (bootstrapMs != null) {
    console.log(
      `%c[Syncro Perf] Bootstrap Dashboard: ${bootstrapMs}ms (Server: ${bootServer?.appMs ?? '?'}ms, DB: ${bootServer?.dbMs ?? '?'}ms, ${studentCount} alumnos)`,
      'color:#38bdf8;font-weight:bold;'
    );
  }
}

export function logBgPrefetch(label, ms) {
  console.log(`%c[Syncro Perf] Prefetch ${label}: ${Math.round(ms)}ms`, 'color:#a1a1aa;');
}
