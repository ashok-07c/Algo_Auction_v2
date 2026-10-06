// Local Offline LAN React 18 Admin Dashboard Application for AlgoAuct Fest
const { useState, useEffect, useMemo } = React;
const h = (type, props, ...children) => React.createElement(type, props, ...children);

function AdminApp() {
  const [socket, setSocket] = useState(null);
  const [state, setState] = useState(null);
  
  // Selection states
  const [selectedAlgoId, setSelectedAlgoId] = useState('');
  const [selectedQId, setSelectedQId] = useState('');
  const [showSoldAlgos, setShowSoldAlgos] = useState(false);

  // New Custom Algo Form
  const [newAlgoName, setNewAlgoName] = useState('');
  const [newAlgoCat, setNewAlgoCat] = useState('');
  const [newAlgoBid, setNewAlgoBid] = useState('');
  const [newAlgoDesc, setNewAlgoDesc] = useState('');

  // New Custom Question Form
  const [newQTitle, setNewQTitle] = useState('');
  const [newQDesc, setNewQDesc] = useState('');
  const [newQPts, setNewQPts] = useState('100');
  const [newQPartialPts, setNewQPartialPts] = useState('25');
  const [newQCoinsReq, setNewQCoinsReq] = useState('50');
  const [newQSelectedAlgoIds, setNewQSelectedAlgoIds] = useState([]);
  const [newQCorrectAlgoId, setNewQCorrectAlgoId] = useState('');

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('connect', () => {
      console.log('Admin connected to socket server');
    });

    s.on('stateUpdate', (newState) => {
      setState(newState);
      if (!selectedQId && newState.questionsCatalog && newState.questionsCatalog.length > 0) {
        setSelectedQId(newState.questionsCatalog[0].id);
      }
    });

    s.on('auctionError', (err) => alert(err.message));
    s.on('questionLaunchSound', () => {
      if (window.soundFx) window.soundFx.playQuestionLaunch();
    });

    return () => s.disconnect();
  }, []);

  // Auto-advance selectedAlgoId to next unsold algorithm whenever state or showSoldAlgos changes
  useEffect(() => {
    if (!state || !state.algorithmsCatalog) return;
    const available = state.algorithmsCatalog.filter(a => showSoldAlgos || !a.sold);
    if (available.length > 0 && (!selectedAlgoId || !available.some(a => a.id === selectedAlgoId))) {
      setSelectedAlgoId(available[0].id);
    }
  }, [state, showSoldAlgos]);

  // Handlers
  const updateConfig = (field, val) => {
    if (!socket || !state) return;
    const newConfig = {
      initialCoins: field === 'initialCoins' ? parseInt(val, 10) : state.config.initialCoins,
      timerDurationSec: field === 'timerDurationSec' ? parseInt(val, 10) : state.config.timerDurationSec
    };
    socket.emit('adminUpdateConfig', newConfig);
  };

  const adjustCoins = (teamId, delta) => {
    const team = state.teams.find(t => t.id === teamId);
    if (team && socket) {
      socket.emit('adminUpdateTeamCoins', { teamId, coins: team.coins + delta });
    }
  };

  const toggleElimination = (teamId) => {
    if (socket) socket.emit('adminToggleElimination', { teamId });
  };

  const eliminateLowestTeam = () => {
    if (!state || !state.teams || state.teams.length === 0) return;
    const active = state.teams.filter(t => !t.eliminated).sort((a, b) => a.coins - b.coins);
    if (active.length <= 1) return alert('Only 1 active team left!');
    const lowest = active[0];
    if (confirm(`Eliminate lowest team "${lowest.name}" (${lowest.coins} coins)?`)) {
      toggleElimination(lowest.id);
    }
  };

  const startAuction = () => {
    if (!socket || !state) return;
    let targetAlgoId = selectedAlgoId;
    const available = (state.algorithmsCatalog || []).filter(a => showSoldAlgos || !a.sold);
    if (!targetAlgoId || !available.some(a => a.id === targetAlgoId)) {
      if (available.length === 0) return alert('All algorithms are sold out! Check "Show Sold" to re-auction.');
      targetAlgoId = available[0].id;
      setSelectedAlgoId(targetAlgoId);
    }
    const algo = state.algorithmsCatalog.find(a => a.id === targetAlgoId);
    if (algo && algo.sold) {
      if (!confirm(`"${algo.name}" was ALREADY SOLD to ${algo.soldTo}. Do you want to re-auction it anyway?`)) return;
      return socket.emit('adminStartAuction', { algoId: targetAlgoId, force: true });
    }
    socket.emit('adminStartAuction', { algoId: targetAlgoId });
  };

  const stopAuction = () => {
    if (socket) socket.emit('adminStopAuction');
  };

  const launchQuestion = () => {
    if (selectedQId && socket) {
      if (window.soundFx) window.soundFx.init();
      socket.emit('adminLaunchQuestion', { questionId: selectedQId });
    }
  };

  const revealAndAward = () => {
    if (socket) socket.emit('adminRevealAndAward');
  };

  const addAlgorithm = (e) => {
    e.preventDefault();
    if (!newAlgoName.trim()) return alert('Algorithm name required.');
    if (socket) {
      socket.emit('adminAddAlgorithm', {
        name: newAlgoName,
        category: newAlgoCat,
        minBid: newAlgoBid,
        description: newAlgoDesc
      });
      setNewAlgoName(''); setNewAlgoCat(''); setNewAlgoBid(''); setNewAlgoDesc('');
    }
  };

  const handleCustomQAlgoToggle = (algoId) => {
    setNewQSelectedAlgoIds(prev => {
      if (prev.includes(algoId)) {
        const next = prev.filter(id => id !== algoId);
        if (newQCorrectAlgoId === algoId) setNewQCorrectAlgoId(next[0] || '');
        return next;
      } else {
        const next = [...prev, algoId];
        if (!newQCorrectAlgoId) setNewQCorrectAlgoId(algoId);
        return next;
      }
    });
  };

  const addQuestion = (e) => {
    e.preventDefault();
    if (!newQTitle.trim()) return alert('Problem title is required.');
    if (!newQDesc.trim()) return alert('Problem statement description is required.');
    if (newQSelectedAlgoIds.length < 3) return alert('Please select at least 3 algorithms to feature as options!');
    if (!newQCorrectAlgoId) return alert('Please select which algorithm is the optimal / correct answer!');

    // Shuffle options so correct answer is not fixed at Position A
    let optionAlgoIds = [...newQSelectedAlgoIds];
    for (let i = optionAlgoIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionAlgoIds[i], optionAlgoIds[j]] = [optionAlgoIds[j], optionAlgoIds[i]];
    }

    socket.emit('adminAddQuestion', {
      title: newQTitle,
      description: newQDesc,
      optionAlgoIds,
      correctAlgoId: newQCorrectAlgoId,
      rewardPoints: parseInt(newQPts, 10) || 100,
      partialPoints: parseInt(newQPartialPts, 10) || 25,
      coinsRequired: parseInt(newQCoinsReq, 10) || 50
    });

    alert('Algorithm Problem created and framed successfully!');
    setNewQTitle(''); setNewQDesc(''); setNewQSelectedAlgoIds([]); setNewQCorrectAlgoId('');
  };

  const triggerFinale = () => {
    if (confirm('Are you sure you want to trigger the GRAND FINALE across all lab screens?')) {
      if (socket) socket.emit('adminTriggerFinale');
    }
  };

  const resetGame = () => {
    if (confirm('⚠️ RESET ALL GAME DATA? This will restart the event.')) {
      if (socket) socket.emit('adminResetGame');
    }
  };

  if (!state) {
    return h('div', {
      style: { display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--primary-cyan)', fontFamily: 'var(--font-mono)' }
    }, h('h2', null, '👑 CONNECTING TO ADMIN CONTROL SERVER...'));
  }

  const availableAlgos = (state.algorithmsCatalog || []).filter(a => showSoldAlgos || !a.sold);
  const selectedQ = (state.questionsCatalog || []).find(q => q.id === selectedQId);

  return h('div', null,
    // Navbar
    h('nav', { className: 'navbar' },
      h('div', { className: 'brand' },
        h('span', { className: 'brand-icon' }, '👑'),
        h('span', { className: 'brand-title' }, 'ADMIN CONTROL DASHBOARD'),
        h('span', { className: 'brand-tag' }, 'AUCTIONEER CONSOLE')
      ),
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
        h('button', {
          className: 'btn btn-secondary',
          onClick: triggerFinale,
          style: { background: 'rgba(255,215,0,0.2)', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }
        }, '🏆 FINALIZE & ANNOUNCE WINNER'),
        h('button', {
          className: 'btn btn-danger',
          onClick: resetGame,
          style: { padding: '6px 14px', fontSize: '0.85rem' }
        }, '⚠️ RESET GAME')
      )
    ),

    // Main Container
    h('div', { className: 'container full-width' },
      // Top Status Bar
      h('div', { className: 'card', style: { marginBottom: '1.5rem' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' } },
          h('div', null,
            h('span', { style: { fontSize: '0.85rem', color: 'var(--text-muted)' } }, 'CURRENT EVENT STATE:'),
            h('h2', { style: { color: 'var(--primary-cyan)', fontWeight: 800 } }, `${state.gameState || 'SETUP'} PHASE`)
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } },
            h('div', null,
              h('label', { className: 'form-label' }, 'Initial Starting Coins'),
              h('input', {
                type: 'number',
                className: 'input-field',
                style: { width: '120px' },
                value: state.config?.initialCoins || 1000,
                onChange: e => updateConfig('initialCoins', e.target.value)
              })
            ),
            h('div', null,
              h('label', { className: 'form-label' }, 'Bid Timer Duration (s)'),
              h('input', {
                type: 'number',
                className: 'input-field',
                style: { width: '120px' },
                value: state.config?.timerDurationSec || 15,
                onChange: e => updateConfig('timerDurationSec', e.target.value)
              })
            )
          )
        )
      ),

      // Admin Grid
      h('div', { className: 'admin-grid' },

        // Panel 1: Teams Management
        h('div', { className: 'card' },
          h('div', { className: 'card-title' },
            h('span', null, `👥 Registered Teams (${state.teams.length})`),
            h('button', {
              className: 'btn btn-secondary',
              style: { fontSize: '0.75rem', padding: '4px 10px' },
              onClick: eliminateLowestTeam
            }, '⚡ Eliminate Lowest Team')
          ),
          h('div', { style: { overflowX: 'auto' } },
            h('table', { style: { width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' } },
              h('thead', null,
                h('tr', { style: { borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' } },
                  h('th', { style: { padding: '8px' } }, 'Team'),
                  h('th', { style: { padding: '8px' } }, 'Coins'),
                  h('th', { style: { padding: '8px' } }, 'Score'),
                  h('th', { style: { padding: '8px' } }, 'Algos'),
                  h('th', { style: { padding: '8px' } }, 'Actions')
                )
              ),
              h('tbody', null,
                state.teams.length === 0 ? h('tr', null,
                  h('td', { colSpan: 5, style: { textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' } },
                    'No teams registered yet. Tell lab PCs to open http://<IP>:3000'
                  )
                ) : state.teams.map(t => h('tr', {
                  key: t.id,
                  style: {
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    opacity: t.eliminated ? 0.5 : 1,
                    background: t.eliminated ? 'rgba(255,0,85,0.05)' : 'transparent'
                  }
                },
                  h('td', { style: { padding: '10px' } },
                    h('div', { style: { fontWeight: 700 } },
                      t.name, ' ', t.eliminated && h('span', { className: 'eliminated-badge' }, 'ELIMINATED')
                    ),
                    h('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)' } }, t.members)
                  ),
                  h('td', { style: { padding: '10px' } },
                    h('div', { className: 'coin-badge', style: { display: 'inline-flex' } }, `🪙 ${t.coins}`),
                    h('div', { style: { marginTop: '4px' } },
                      h('button', { className: 'btn btn-secondary', style: { padding: '2px 6px', fontSize: '0.7rem' }, onClick: () => adjustCoins(t.id, 100) }, '+100'),
                      h('button', { className: 'btn btn-secondary', style: { padding: '2px 6px', fontSize: '0.7rem', marginLeft: '4px' }, onClick: () => adjustCoins(t.id, -100) }, '-100')
                    )
                  ),
                  h('td', { style: { padding: '10px', fontFamily: 'var(--font-mono)' } }, `${t.score || 0} pts`),
                  h('td', { style: { padding: '10px', fontSize: '0.8rem' } },
                    (t.algorithms || []).map((a, i) => h('span', {
                      key: i,
                      className: 'algo-badge',
                      style: { fontSize: '0.75rem', padding: '2px 6px', marginRight: '4px' }
                    }, a.name))
                  ),
                  h('td', { style: { padding: '10px' } },
                    h('button', {
                      className: `btn ${t.eliminated ? '' : 'btn-danger'}`,
                      style: { padding: '4px 10px', fontSize: '0.8rem' },
                      onClick: () => toggleElimination(t.id)
                    }, t.eliminated ? 'Restore Team' : 'Eliminate')
                  )
                ))
              )
            )
          )
        ),

        // Panel 2: Live Auctioneer Console
        h('div', { className: 'card' },
          h('div', { className: 'card-title' },
            h('span', null, '🔨 Algorithm Auctioneer'),
            h('span', {
              className: 'brand-tag',
              style: { background: state.currentAuction?.active ? 'var(--accent-pink)' : 'rgba(255,255,255,0.2)' }
            }, state.currentAuction?.active ? 'AUCTION LIVE 🔥' : 'IDLE')
          ),

          h('div', { style: { marginBottom: '1rem' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
              h('label', { className: 'form-label', style: { margin: 0 } }, 'Select Available Algorithm to Auction'),
              h('label', { style: { fontSize: '0.75rem', color: 'var(--primary-cyan)', cursor: 'pointer' } },
                h('input', {
                  type: 'checkbox',
                  checked: showSoldAlgos,
                  onChange: e => setShowSoldAlgos(e.target.checked)
                }),
                ' Show Sold Algos'
              )
            ),

            h('select', {
              className: 'input-field',
              style: { marginBottom: '1rem' },
              value: selectedAlgoId,
              onChange: e => setSelectedAlgoId(e.target.value)
            },
              availableAlgos.length === 0
                ? h('option', { value: '' }, "-- ALL ALGORITHMS SOLD OUT! (Check 'Show Sold' to re-auction) --")
                : availableAlgos.map(a => h('option', { key: a.id, value: a.id },
                  `${a.sold ? '⛔ [SOLD OUT] ' : ''}${a.name} (${a.category}) - Min Bid: ${a.minBid} Coins ${a.sold ? `(Sold to ${a.soldTo})` : ''}`
                ))
            ),

            h('div', { style: { display: 'flex', gap: '10px' } },
              h('button', { className: 'btn', style: { flex: 1 }, onClick: startAuction }, '🚀 LAUNCH AUCTION'),
              h('button', { className: 'btn btn-danger', onClick: stopAuction }, '⏸️ PAUSE')
            )
          ),

          // LIVE AUCTION STATUS MONITOR WINDOW
          h('div', { style: { background: 'rgba(0,0,0,0.4)', padding: '1.2rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' } },
            h('div', { style: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' } }, 'LIVE AUCTION MONITOR'),
            h('div', { style: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-gold)' } },
              state.currentAuction?.active ? h('div', null,
                `⚡ ${state.currentAuction.statusMessage}`,
                h('br'),
                h('span', { style: { fontSize: '0.9rem', color: '#fff' } },
                  'Current High: ', h('strong', null, `${state.currentAuction.highestBid} Coins`), ' by ', h('strong', null, state.currentAuction.highestBidderName || 'None')
                )
              ) : state.currentAuction?.algo ? h('div', null, `📢 ${state.currentAuction.statusMessage}`)
                : 'No active auction.'
            )
          ),

          // Add Custom Algo Collapse
          h('details', { style: { marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' } },
            h('summary', { style: { cursor: 'pointer', fontWeight: 700, color: 'var(--primary-cyan)' } }, '+ Add Custom Algorithm'),
            h('form', { onSubmit: addAlgorithm, style: { marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' } },
              h('input', { type: 'text', className: 'input-field', placeholder: 'Algo Name (e.g. A* Search)', value: newAlgoName, onChange: e => setNewAlgoName(e.target.value), required: true }),
              h('input', { type: 'text', className: 'input-field', placeholder: 'Category (e.g. Pathfinding)', value: newAlgoCat, onChange: e => setNewAlgoCat(e.target.value) }),
              h('input', { type: 'number', className: 'input-field', placeholder: 'Min Base Bid (e.g. 50)', value: newAlgoBid, onChange: e => setNewAlgoBid(e.target.value) }),
              h('input', { type: 'text', className: 'input-field', placeholder: 'Description', value: newAlgoDesc, onChange: e => setNewAlgoDesc(e.target.value) }),
              h('button', { type: 'submit', className: 'btn', style: { width: '100%', fontSize: '0.9rem' } }, 'Add to Inventory')
            )
          )
        ),

        // Panel 3: Graph Question Manager & Detailed Preview
        h('div', { className: 'card', style: { gridColumn: 'span 2' } },
          h('div', { className: 'card-title' },
            h('span', null, '🧩 Graph Question Manager & Evaluator')
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' } },
            h('div', null,
              h('label', { className: 'form-label' }, 'Select Graph Question to Inspect & Launch'),
              h('select', {
                className: 'input-field',
                style: { marginBottom: '1rem' },
                value: selectedQId,
                onChange: e => setSelectedQId(e.target.value)
              },
                (state.questionsCatalog || []).map(q => h('option', { key: q.id, value: q.id },
                  `${q.title} (${(q.optionAlgoIds || []).length} Options, 🪙${q.coinsRequired || 50} Fee, +${q.rewardPoints || 100} Pts)`
                ))
              ),

              // DETAILED QUESTION PREVIEW CARD (With Fee & Points Edit)
              selectedQ && h(QuestionPreviewCard, { q: selectedQ, state, socket }),

              h('div', { style: { display: 'flex', gap: '10px', marginBottom: '1rem', marginTop: '1rem' } },
                h('button', { className: 'btn', style: { flex: 1 }, onClick: launchQuestion }, '📢 LAUNCH TO LAB'),
                h('button', { className: 'btn btn-secondary', style: { background: 'var(--accent-green)', color: '#000' }, onClick: revealAndAward }, '✅ REVEAL & AWARD')
              ),

              // Submissions Monitor
              h('div', { style: { background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '10px' } },
                h('div', { style: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' } }, 'SUBMISSIONS RECEIVED'),
                h('div', { style: { fontSize: '0.9rem' } },
                  (!state.currentQuestion?.active || !state.currentQuestion?.submissions || Object.keys(state.currentQuestion.submissions).length === 0)
                    ? h('span', { style: { color: 'var(--text-muted)' } }, 'Waiting for teams to submit algorithm answers...')
                    : Object.keys(state.currentQuestion.submissions).map(tId => {
                      const team = state.teams.find(t => t.id === tId);
                      const sub = state.currentQuestion.submissions[tId];
                      return h('div', { key: tId, style: { marginBottom: '4px' } },
                        '🔹 ', h('strong', null, team ? team.name : 'Unknown Team'), ': ',
                        state.currentQuestion.revealed
                          ? (sub.isCorrect
                            ? h('span', { style: { color: 'var(--accent-green)', fontWeight: 700 } }, `✅ OPTIMAL (+${selectedQ?.rewardPoints || 100} Pts)`)
                            : h('span', { style: { color: 'var(--accent-gold)', fontWeight: 700 } }, `🟡 SUBOPTIMAL CHOICE (+${selectedQ?.partialPoints !== undefined ? selectedQ.partialPoints : 25} Pts)`))
                          : `Submitted (Paid 🪙${sub.paidCoins || 50} Fee)`
                      );
                    })
                )
              )
            ),

            // Frame Custom Algorithm Problem Form
            h('div', null,
              h('details', { style: { background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }, open: true },
                h('summary', { style: { cursor: 'pointer', fontWeight: 700, color: 'var(--primary-cyan)' } }, '+ Frame Custom Algorithm Problem'),
                h('form', { onSubmit: addQuestion, style: { marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' } },
                  h('input', { type: 'text', className: 'input-field', placeholder: 'Problem Title (e.g. Negative Weight Shortest Path)', value: newQTitle, onChange: e => setNewQTitle(e.target.value), required: true }),
                  h('textarea', { className: 'input-field', placeholder: 'Problem Description Statement...', style: { height: '70px' }, value: newQDesc, onChange: e => setNewQDesc(e.target.value), required: true }),

                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' } },
                    h('div', null,
                      h('label', { className: 'form-label', style: { fontSize: '0.78rem' } }, 'Coin Fee to Answer'),
                      h('input', { type: 'number', className: 'input-field', placeholder: 'Coin Fee (50)', value: newQCoinsReq, onChange: e => setNewQCoinsReq(e.target.value) })
                    ),
                    h('div', null,
                      h('label', { className: 'form-label', style: { fontSize: '0.78rem' } }, 'Optimal Reward Pts'),
                      h('input', { type: 'number', className: 'input-field', placeholder: 'Optimal Pts (100)', value: newQPts, onChange: e => setNewQPts(e.target.value) })
                    ),
                    h('div', null,
                      h('label', { className: 'form-label', style: { fontSize: '0.78rem' } }, 'Partial Answer Pts'),
                      h('input', { type: 'number', className: 'input-field', placeholder: 'Partial Pts (25)', value: newQPartialPts, onChange: e => setNewQPartialPts(e.target.value) })
                    )
                  ),

                  h('label', { className: 'form-label', style: { color: 'var(--primary-cyan)', fontWeight: 700 } },
                    '1. Select 3 or More Algorithms to Feature as Problem Options:'
                  ),
                  h('div', { style: { background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', maxHeight: '130px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } },
                    (state.algorithmsCatalog || []).map(a => h('label', {
                      key: a.id,
                      style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px' }
                    },
                      h('input', {
                        type: 'checkbox',
                        checked: newQSelectedAlgoIds.includes(a.id),
                        onChange: () => handleCustomQAlgoToggle(a.id)
                      }),
                      h('span', null, a.name)
                    ))
                  ),

                  h('label', { className: 'form-label', style: { color: 'var(--accent-green)', fontWeight: 700, marginTop: '4px' } },
                    '2. Select WHICH Algorithm is the Optimal / Correct Answer:'
                  ),
                  h('div', { style: { background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' } },
                    newQSelectedAlgoIds.length === 0
                      ? h('span', { style: { color: 'var(--accent-red)', fontSize: '0.8rem' } }, 'Please check at least 3 algorithms above.')
                      : newQSelectedAlgoIds.map(algoId => {
                        const algo = state.algorithmsCatalog.find(a => a.id === algoId);
                        return h('label', { key: algoId, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' } },
                          h('input', {
                            type: 'radio',
                            name: 'correct-algo-radio',
                            value: algoId,
                            checked: newQCorrectAlgoId === algoId,
                            onChange: () => setNewQCorrectAlgoId(algoId)
                          }),
                          h('strong', { style: { color: 'var(--accent-green)' } }, algo ? algo.name : algoId)
                        );
                      })
                  ),

                  h('button', { type: 'submit', className: 'btn', style: { marginTop: '8px' } }, '🚀 Save & Frame Problem')
                )
              )
            )
          )
        ),

        // Panel 4: Team Scorecards Overview
        h('div', { className: 'card', style: { gridColumn: 'span 2' } },
          h('div', { className: 'card-title' },
            h('span', null, '📊 Teams Question Scorecards (Optimal vs Partial Credit Overview)')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' } },
            state.teams.map(t => {
              const won = t.wonQuestions || [];
              const optimalCount = won.filter(w => w.isOptimal).length;
              const partialCount = won.filter(w => !w.isOptimal).length;
              const lostCount = (t.lostQuestions || []).length;
              return h('div', {
                key: t.id,
                style: { background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }
              },
                h('h4', { style: { color: 'var(--primary-cyan)', marginBottom: '8px' } }, `${t.name} Scorecard`),
                h('div', { style: { fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' } },
                  h('div', null, '🏆 Optimal: ', h('strong', { style: { color: 'var(--accent-green)' } }, optimalCount), ' | 🟡 Partial: ', h('strong', { style: { color: 'var(--accent-gold)' } }, partialCount), ' | ❌ Missed: ', h('strong', null, lostCount)),
                  h('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)' } }, `Score: ${t.score || 0} pts | Coins: 🪙 ${t.coins}`)
                )
              );
            })
          )
        )
      ),

      // Real-time Logs
      h('div', { className: 'card', style: { marginTop: '1.5rem' } },
        h('div', { className: 'card-title' },
          h('span', null, '📜 System Real-Time Activity Log')
        ),
        h('div', { style: { maxHeight: '200px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--primary-cyan)' } },
          (state.logs || []).map((l, i) => h('div', { key: i },
            h('span', { style: { color: 'var(--text-muted)' } }, `[${l.timestamp}] `),
            l.text
          ))
        )
      )
    )
  );
}

// DETAILED QUESTION PREVIEW CARD COMPONENT
function QuestionPreviewCard({ q, state, socket }) {
  const optionAlgoIds = q.optionAlgoIds || [];
  const optionAlgos = optionAlgoIds.map(id => {
    return (state.algorithmsCatalog || []).find(a => a.id === id) || { id, name: id, category: 'General' };
  });

  const correctAlgo = (state.algorithmsCatalog || []).find(a => a.id === q.correctAlgoId) || { name: q.correctAlgoId };

  const teams = state.teams || [];
  const teamEligibility = teams.map(t => {
    const owned = (t.algorithms || []).map(a => a.id);
    const isEligible = optionAlgoIds.some(id => owned.includes(id));
    const matchingCount = optionAlgoIds.filter(id => owned.includes(id)).length;
    return { team: t, isEligible, matchingCount };
  });

  const eligibleCount = teamEligibility.filter(t => t.isEligible).length;

  const [editCoins, setEditCoins] = useState(q.coinsRequired !== undefined ? q.coinsRequired : 50);
  const [editOptimalPts, setEditOptimalPts] = useState(q.rewardPoints !== undefined ? q.rewardPoints : 100);
  const [editPartialPts, setEditPartialPts] = useState(q.partialPoints !== undefined ? q.partialPoints : 25);

  useEffect(() => {
    setEditCoins(q.coinsRequired !== undefined ? q.coinsRequired : 50);
    setEditOptimalPts(q.rewardPoints !== undefined ? q.rewardPoints : 100);
    setEditPartialPts(q.partialPoints !== undefined ? q.partialPoints : 25);
  }, [q.id, q.coinsRequired, q.rewardPoints, q.partialPoints]);

  const saveQuestionSettings = () => {
    if (socket) {
      socket.emit('adminUpdateQuestion', {
        questionId: q.id,
        coinsRequired: parseInt(editCoins, 10) || 0,
        rewardPoints: parseInt(editOptimalPts, 10) || 0,
        partialPoints: parseInt(editPartialPts, 10) || 0
      });
      alert('Question pricing & point rewards updated successfully!');
    }
  };

  return h('div', {
    style: { background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(0, 240, 255, 0.2)', marginBottom: '1rem' }
  },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '6px' } },
      h('h3', { style: { color: 'var(--primary-cyan)', fontSize: '1.05rem', margin: 0 } }, q.title),
      h('div', { style: { display: 'flex', gap: '6px' } },
        h('span', { className: 'coin-badge', style: { fontSize: '0.75rem' } }, `🪙 ${q.coinsRequired || 50} Fee`),
        h('span', { className: 'coin-badge', style: { fontSize: '0.75rem', background: 'rgba(0,255,157,0.15)', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' } }, `+${q.rewardPoints || 100} Pts (Optimal)`),
        h('span', { className: 'coin-badge', style: { fontSize: '0.75rem', background: 'rgba(255,170,0,0.15)', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' } }, `+${q.partialPoints !== undefined ? q.partialPoints : 25} Pts (Option)`)
      )
    ),

    h('div', { style: { fontSize: '0.85rem', color: '#e0e6ed', lineHeight: '1.4', marginBottom: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' } },
      h('strong', null, 'Statement: '), q.description
    ),

    // ADMIN PRICING & REWARD CONTROL BOX
    h('div', { style: { background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)', padding: '8px 12px', borderRadius: '8px', marginBottom: '0.8rem' } },
      h('div', { style: { fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-cyan)', marginBottom: '6px' } }, '⚙️ ADMIN PRICING & REWARDS CONTROL:'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'center' } },
        h('div', null,
          h('label', { style: { fontSize: '0.72rem', color: 'var(--text-muted)' } }, 'Coin Fee to Answer'),
          h('input', { type: 'number', className: 'input-field', style: { padding: '3px 6px', fontSize: '0.8rem' }, value: editCoins, onChange: e => setEditCoins(e.target.value) })
        ),
        h('div', null,
          h('label', { style: { fontSize: '0.72rem', color: 'var(--accent-green)' } }, 'Optimal Reward Pts'),
          h('input', { type: 'number', className: 'input-field', style: { padding: '3px 6px', fontSize: '0.8rem' }, value: editOptimalPts, onChange: e => setEditOptimalPts(e.target.value) })
        ),
        h('div', null,
          h('label', { style: { fontSize: '0.72rem', color: 'var(--accent-gold)' } }, 'Partial Option Pts'),
          h('input', { type: 'number', className: 'input-field', style: { padding: '3px 6px', fontSize: '0.8rem' }, value: editPartialPts, onChange: e => setEditPartialPts(e.target.value) })
        ),
        h('button', { className: 'btn btn-secondary', style: { fontSize: '0.75rem', padding: '6px 10px', marginTop: '12px' }, onClick: saveQuestionSettings }, 'Save Fees')
      )
    ),

    h('div', { style: { marginBottom: '0.8rem' } },
      h('strong', { style: { fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' } }, `Featured Option Algorithms (${optionAlgos.length}):`),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' } },
        optionAlgos.map((a, i) => h('span', {
          key: a.id,
          className: 'algo-badge',
          style: {
            borderColor: a.id === q.correctAlgoId ? 'var(--accent-green)' : '',
            background: a.id === q.correctAlgoId ? 'rgba(0,255,157,0.15)' : '',
            fontWeight: a.id === q.correctAlgoId ? 700 : 400
          }
        }, `${String.fromCharCode(65 + i)}. ${a.name} `, a.id === q.correctAlgoId && '✅ (Optimal)'))
      )
    ),

    h('div', { style: { background: 'rgba(0,255,157,0.08)', border: '1px solid var(--accent-green)', padding: '8px', borderRadius: '6px', marginBottom: '0.8rem', fontSize: '0.85rem' } },
      h('div', { style: { color: 'var(--accent-green)', fontWeight: 700, marginBottom: '2px' } }, `✅ OPTIMAL SOLUTION: ${correctAlgo.name}`),
      h('div', { style: { color: '#d0f0e0', fontSize: '0.8rem' } },
        h('strong', null, 'Judge Explanation: '), q.explanation || 'Optimal solution for this problem.'
      )
    ),

    h('div', { style: { background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', fontSize: '0.85rem' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
        h('strong', { style: { color: '#fff' } }, 'LAB TEAMS PARTICIPATION ELIGIBILITY:'),
        h('span', { style: { fontWeight: 700, color: eligibleCount > 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '0.8rem' } },
          `${eligibleCount}/${teams.length} Teams Eligible`
        )
      ),
      teams.length === 0
        ? h('span', { style: { color: 'var(--text-muted)', fontSize: '0.8rem' } }, 'No teams registered in lab yet.')
        : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '110px', overflowY: 'auto' } },
          teamEligibility.map(te => h('div', {
            key: te.team.id,
            style: {
              display: 'flex',
              justify: 'space-between',
              fontSize: '0.8rem',
              padding: '4px 8px',
              borderRadius: '4px',
              background: te.isEligible ? 'rgba(0,255,157,0.08)' : 'rgba(255,0,85,0.08)'
            }
          },
            h('span', { style: { fontWeight: 700, textDecoration: te.team.eliminated ? 'line-through' : 'none', opacity: te.team.eliminated ? 0.6 : 1 } },
              te.team.name, te.team.eliminated ? ' (Eliminated)' : ''
            ),
            h('span', null,
              te.isEligible
                ? h('span', { style: { color: 'var(--accent-green)', fontWeight: 700 } }, `✅ Eligible (${te.matchingCount} Algos)`)
                : h('span', { style: { color: 'var(--accent-red)', fontWeight: 700 } }, '🔒 Locked (Missing Algos)')
            )
          ))
        )
    )
  );
}

// Mount React Root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(AdminApp));
