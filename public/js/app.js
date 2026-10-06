// Local Offline LAN React 18 Participant Application for AlgoAuct Fest
const { useState, useEffect, useMemo, useRef } = React;
const h = (type, props, ...children) => React.createElement(type, props, ...children);

function App() {
  const [socket, setSocket] = useState(null);
  const [state, setState] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [selectedAlgoId, setSelectedAlgoId] = useState(null);
  const [customBidInput, setCustomBidInput] = useState('');
  const [soundMuted, setSoundMuted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [jumbledAlgosMap, setJumbledAlgosMap] = useState({});

  const currentTeamRef = useRef(currentTeam);
  const soundMutedRef = useRef(soundMuted);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    currentTeamRef.current = currentTeam;
  }, [currentTeam]);

  useEffect(() => {
    soundMutedRef.current = soundMuted;
  }, [soundMuted]);

  // Audio Context unlock & monitor listener
  useEffect(() => {
    const unlockAudio = () => {
      if (window.soundFx) {
        window.soundFx.init();
        if (window.soundFx.ctx && window.soundFx.ctx.state === 'running') {
          setAudioUnlocked(true);
        }
      }
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const toggleSound = () => {
    if (window.soundFx) {
      window.soundFx.init();
      if (!soundMuted) {
        setSoundMuted(true);
      } else {
        setSoundMuted(false);
        window.soundFx.playSelfBid();
      }
    }
  };

  // Socket Connection & State Subscription
  useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('connect', () => {
      console.log('Participant connected to local socket server');
    });

    s.on('stateUpdate', (newState) => {
      setState(newState);
      const savedId = localStorage.getItem('algoauct_team_id');
      if (savedId && newState.teams) {
        const team = newState.teams.find(t => t.id === savedId);
        if (team) setCurrentTeam(team);
      }
    });

    // Dedicated Sound Event Handlers
    s.on('auctionStartSound', () => {
      if (!soundMutedRef.current && window.soundFx) window.soundFx.playGoing();
    });

    s.on('bidPlacedSound', (data) => {
      if (soundMutedRef.current || !window.soundFx) return;
      const isSelf = currentTeamRef.current && data && data.bidderId === currentTeamRef.current.id;
      if (isSelf) {
        window.soundFx.playSelfBid();
      } else {
        window.soundFx.playOtherBid();
      }
    });

    s.on('auctionCallSound', () => {
      if (!soundMutedRef.current && window.soundFx) window.soundFx.playGoing();
    });

    s.on('auctionSoldSound', (data) => {
      if (soundMutedRef.current || !window.soundFx) return;
      const isSelfWinner = currentTeamRef.current && data && data.winnerId === currentTeamRef.current.id;
      if (isSelfWinner) {
        window.soundFx.playSelfWon();
        if (window.confetti) window.confetti();
      } else {
        window.soundFx.playSold();
      }
    });

    s.on('questionLaunchSound', () => {
      if (!soundMutedRef.current && window.soundFx) window.soundFx.playQuestionLaunch();
    });

    s.on('finaleSound', () => {
      if (!soundMutedRef.current && window.soundFx) window.soundFx.playFinale();
    });

    return () => s.disconnect();
  }, []);

  // Team Registration Handler
  const handleRegister = (e) => {
    e.preventDefault();
    if (!regName.trim()) return alert('Team Name is required.');
    if (!socket) return;

    if (window.soundFx) window.soundFx.init();

    socket.emit('registerTeam', {
      name: regName,
      members: regMembers,
      color: regColor
    }, (res) => {
      if (res.success && res.team) {
        setCurrentTeam(res.team);
        localStorage.setItem('algoauct_team_id', res.team.id);
      } else {
        alert(res.message || 'Registration failed.');
      }
    });
  };

  // Form State
  const [regName, setRegName] = useState('');
  const [regMembers, setRegMembers] = useState('');
  const [regColor, setRegColor] = useState('#00f0ff');

  // Place Bid Handler
  const placeBid = (amount) => {
    if (!currentTeam || !socket) return;
    if (window.soundFx) window.soundFx.init();

    socket.emit('placeBid', { teamId: currentTeam.id, amount }, (res) => {
      if (!res.success) {
        alert(res.message);
      } else {
        setCustomBidInput('');
      }
    });
  };

  // Quick Bid
  const quickBid = (step) => {
    if (!state || !state.currentAuction || !state.currentAuction.algo) return;
    const currentHigh = state.currentAuction.highestBid;
    const baseBid = state.currentAuction.algo.minBid;
    const amount = currentHigh > 0 ? currentHigh + step : baseBid;
    placeBid(amount);
  };

  // Submit Answer Handler
  const submitAnswer = () => {
    if (!selectedAlgoId || !currentTeam || !socket) return;
    socket.emit('submitQuestionAnswer', { teamId: currentTeam.id, selectedAlgoId }, (res) => {
      alert(res.message);
    });
  };

  if (!state) {
    return h('div', { style: { display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--primary-cyan)', fontFamily: 'var(--font-mono)' } },
      h('h2', null, '⚡ CONNECTING TO ALGOAUCT LAB SERVER...')
    );
  }

  return h('div', null,
    // Audio Unlock Warning Bar if audio is suspended
    !audioUnlocked && h('div', {
      onClick: () => { if (window.soundFx) window.soundFx.init(); setAudioUnlocked(true); },
      style: { background: 'var(--accent-gold)', color: '#000', padding: '6px 12px', textAlign: 'center', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', letterSpacing: '0.5px' }
    }, '🔔 CLICK ANYWHERE ON THIS SCREEN TO ENABLE LAB AUDIO SOUNDS! 🔊'),

    // 1. Registration Modal
    !currentTeam && h('div', { className: 'modal-overlay', style: { display: 'flex' } },
      h('div', { className: 'modal-card' },
        h('div', { className: 'modal-title' }, '⚔️ ALGOAUCT 2026'),
        h('p', { style: { textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem' } },
          'Enter your team details to join the Algorithm Auction event!'
        ),
        h('form', { onSubmit: handleRegister },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Team Name *'),
            h('input', { type: 'text', className: 'input-field', placeholder: 'e.g. Graph Masters', value: regName, onChange: e => setRegName(e.target.value), required: true })
          ),
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Team Members *'),
            h('input', { type: 'text', className: 'input-field', placeholder: 'e.g. Alice & Bob', value: regMembers, onChange: e => setRegMembers(e.target.value), required: true })
          ),
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Team Theme Color'),
            h('select', { className: 'input-field', value: regColor, onChange: e => setRegColor(e.target.value) },
              h('option', { value: '#00f0ff' }, 'Cyan Neon'),
              h('option', { value: '#7000ff' }, 'Purple Cyber'),
              h('option', { value: '#00ff9d' }, 'Emerald Mint'),
              h('option', { value: '#ffaa00' }, 'Gold Amber'),
              h('option', { value: '#ff007f' }, 'Hot Pink')
            )
          ),
          h('button', { type: 'submit', className: 'btn', style: { width: '100%', marginTop: '1rem' } }, '🚀 ENTER AUCTION ARENA')
        )
      )
    ),

    // 2. Navbar
    h('nav', { className: 'navbar' },
      h('div', { className: 'brand' },
        h('span', { className: 'brand-icon' }, '⚡'),
        h('span', { className: 'brand-title' }, 'ALGOAUCT'),
        h('span', { className: 'brand-tag' }, 'FEST LAB')
      ),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } },
        h('button', { className: 'btn btn-secondary', style: { padding: '6px 12px', fontSize: '0.85rem' }, onClick: toggleSound },
          soundMuted ? '🔇 Muted' : '🔊 Sound Active (Test 🔔)'
        ),
        currentTeam && h('div', { className: 'team-pill', style: { display: 'flex' } },
          h('span', { className: 'team-name' }, currentTeam.name),
          h('div', { className: 'coin-badge' },
            h('span', null, '🪙'),
            h('span', null, currentTeam.coins)
          )
        )
      )
    ),

    // 3. Main Container
    h('div', { className: 'container' },
      h('main', { className: 'arena-container' },
        
        // Status Header Bar
        h('div', { className: 'card', style: { marginBottom: 0 } },
          h('div', { className: 'card-title', style: { border: 'none', paddingBottom: 0, marginBottom: 0 } },
            h('span', null,
              state.gameState === 'BIDDING'
                ? (state.currentAuction?.active ? '🔥 PHASE 1: ALGORITHM AUCTION IN PROGRESS' : '🔨 ALGORITHM AUCTION FINALIZED')
                : state.gameState === 'QUESTION'
                ? '🧩 PHASE 2: GRAPH PROBLEM SOLVING'
                : state.gameState === 'FINALE'
                ? '🏆 GRAND FINALE & WINNER CEREMONY'
                : '⏳ LOBBY: WAITING FOR ADMIN TO START AUCTION'
            ),
            h('span', { className: 'brand-tag' },
              state.gameState === 'BIDDING' ? 'AUCTION ARENA' : state.gameState === 'QUESTION' ? 'GRAPH ARENA' : state.gameState === 'FINALE' ? 'FINALE' : 'LOBBY'
            )
          )
        ),

        // Elimination Overlay
        currentTeam && currentTeam.eliminated && h('div', { className: 'card eliminated-overlay', style: { display: 'flex' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } },
            h('span', { style: { fontSize: '2.5rem' } }, '🚫'),
            h('div', null,
              h('h3', { style: { color: 'var(--accent-red)' } }, 'TEAM ELIMINATED'),
              h('p', { style: { color: 'var(--text-muted)', fontSize: '0.9rem' } },
                'Your team has been eliminated. You are now in spectator mode.'
              )
            )
          )
        ),

        // LOBBY VIEW: Event Rules & Master Algorithm Catalog
        state.gameState === 'SETUP' && h(LobbyRulesAndCatalogView, {
          algorithmsCatalog: state.algorithmsCatalog,
          searchTerm,
          setSearchTerm
        }),

        // AUCTION ARENA VIEW
        state.gameState === 'BIDDING' && state.currentAuction && (state.currentAuction.active || state.currentAuction.algo) && h(AuctionArenaView, {
          auc: state.currentAuction,
          currentTeam,
          customBidInput,
          setCustomBidInput,
          quickBid,
          placeBid,
          bidsHistory: state.bidsHistory || []
        }),

        // QUESTION ARENA VIEW
        state.gameState === 'QUESTION' && state.currentQuestion && state.currentQuestion.question && h(QuestionArenaView, {
          qState: state.currentQuestion,
          algorithmsCatalog: state.algorithmsCatalog,
          currentTeam,
          selectedAlgoId,
          setSelectedAlgoId,
          submitAnswer,
          jumbledAlgosMap,
          setJumbledAlgosMap
        }),

        // Scorecard
        h(ScorecardCard, { currentTeam })
      ),

      // Right Sidebar
      h(Sidebar, { currentTeam, teams: state.teams })
    ),

    // Finale Modal
    state.gameState === 'FINALE' && h(FinaleModal, { teams: state.teams })
  );
}

// -------------------------------------------------------------
// Component 1: LOBBY RULES & MASTER ALGORITHM CATALOG VIEW
// -------------------------------------------------------------
function LobbyRulesAndCatalogView({ algorithmsCatalog, searchTerm, setSearchTerm }) {
  const filteredAlgos = useMemo(() => {
    if (!algorithmsCatalog) return [];
    if (!searchTerm.trim()) return algorithmsCatalog;
    return algorithmsCatalog.filter(a =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [algorithmsCatalog, searchTerm]);

  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' } },
    
    // 📜 Official Event Rules
    h('div', { className: 'card', style: { background: 'rgba(0,0,0,0.4)', border: '1px solid var(--primary-cyan)' } },
      h('div', { className: 'card-title' },
        h('span', { style: { color: 'var(--primary-cyan)', fontSize: '1.2rem' } }, '📜 OFFICIAL EVENT RULES')
      ),

      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginTop: '0.5rem' } },
        h('div', { style: { background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' } },
          h('h4', { style: { color: 'var(--accent-gold)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' } },
            h('span', null, '🔨'), 'PHASE 1: ALGORITHM AUCTION'
          ),
          h('ul', { style: { fontSize: '0.88rem', color: '#e0e6ed', lineHeight: '1.6', paddingLeft: '1.2rem', margin: 0 } },
            h('li', null, 'Every team starts with ', h('strong', null, '1,000 Coins'), '.'),
            h('li', null, 'Admin auctions algorithms one by one with a live call timer.'),
            h('li', null, 'Placing a higher bid resets the call timer for all participants.'),
            h('li', null, 'You cannot outbid your own team while holding the top bid!')
          )
        ),

        h('div', { style: { background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' } },
          h('h4', { style: { color: 'var(--accent-green)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' } },
            h('span', null, '🧩'), 'PHASE 2: GRAPH PROBLEM SOLVING'
          ),
          h('ul', { style: { fontSize: '0.88rem', color: '#e0e6ed', lineHeight: '1.6', paddingLeft: '1.2rem', margin: 0 } },
            h('li', null, 'Problem statements feature 3 to 6 algorithm choices.'),
            h('li', null, h('strong', null, 'COIN SUBMISSION FEE:'), ' Submitting an answer requires a coin fee (e.g. 🪙 50 Coins).'),
            h('li', null, h('strong', null, 'POINT REWARDS:'), ' Optimal solutions award full points (e.g. +100 Pts). Any valid option submitted awards partial credit (e.g. +25 Pts)!')
          )
        )
      )
    ),

    // 🧠 Master Algorithm Catalog & Minimum Bids Table
    h('div', { className: 'card' },
      h('div', { className: 'card-title', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' } },
        h('span', null, `🧠 Master Algorithm Catalog & Minimum Bids (${algorithmsCatalog.length} Algorithms)`),
        h('input', {
          type: 'text',
          className: 'input-field',
          placeholder: '🔍 Search algorithms by name or category...',
          style: { width: '280px', padding: '6px 12px', fontSize: '0.85rem' },
          value: searchTerm,
          onChange: e => setSearchTerm(e.target.value)
        })
      ),

      h('div', { style: { overflowX: 'auto', marginTop: '0.5rem' } },
        h('table', { style: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' } },
          h('thead', null,
            h('tr', { style: { borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' } },
              h('th', { style: { padding: '10px' } }, 'Algorithm Name'),
              h('th', { style: { padding: '10px' } }, 'Category'),
              h('th', { style: { padding: '10px' } }, 'Primary Application / Main Use'),
              h('th', { style: { padding: '10px', textAlign: 'right' } }, 'Minimum Starting Bid')
            )
          ),
          h('tbody', null,
            filteredAlgos.map(algo => h('tr', { key: algo.id, style: { borderBottom: '1px solid rgba(255,255,255,0.05)' } },
              h('td', { style: { padding: '10px', fontWeight: '700', color: '#fff' } }, algo.name),
              h('td', { style: { padding: '10px', color: 'var(--primary-cyan)' } }, algo.category),
              h('td', { style: { padding: '10px', color: 'var(--text-muted)', fontSize: '0.82rem' } }, algo.description),
              h('td', { style: { padding: '10px', textAlign: 'right' } },
                h('div', { className: 'coin-badge', style: { display: 'inline-flex', fontSize: '0.85rem' } },
                  `🪙 ${algo.minBid}`
                )
              )
            ))
          )
        )
      )
    )
  );
}

// -------------------------------------------------------------
// Component 2: AUCTION ARENA VIEW (With Admin Live Monitor Window)
// -------------------------------------------------------------
function AuctionArenaView({ auc, currentTeam, customBidInput, setCustomBidInput, quickBid, placeBid, bidsHistory }) {
  const isHighestBidder = currentTeam && auc.highestBidderId === currentTeam.id;
  const isEliminated = currentTeam && currentTeam.eliminated;
  const isAuctionClosed = !auc.active || auc.timerSeconds <= 0 || auc.announcementStage === 3;
  const disableBidding = isEliminated || isHighestBidder || isAuctionClosed;

  const stageInfo = useMemo(() => {
    if (auc.announcementStage === 1) return { text: '📣 1st CALL: GOING ONCE', bg: '#ff9900', color: '#000' };
    if (auc.announcementStage === 2) return { text: '📣📣 2nd CALL: GOING TWICE', bg: '#ff3300', color: '#fff' };
    if (auc.announcementStage === 3 || !auc.active) return { text: '🔨 3rd CALL: SOLD OUT / CLOSED', bg: 'var(--accent-green)', color: '#000' };
    return { text: '🔥 BIDDING OPEN', bg: 'var(--primary-cyan)', color: '#000' };
  }, [auc.announcementStage, auc.active]);

  return h('div', { className: 'card', style: { marginTop: '1rem' } },
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' } },
      
      // Left Column: Bidding Details & Exact Admin Live Auction Monitor Window
      h('div', null,
        h('div', { className: 'auction-header' },
          h('div', { className: 'algo-info' },
            h('span', { className: 'algo-category' }, auc.algo.category || 'Algorithm'),
            h('h2', null, auc.algo.name),
            h('p', { style: { color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' } }, auc.algo.description || '')
          ),

          h('div', { className: 'timer-box', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '180px', justifyContent: 'center' } },
            h('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'AUCTION CALL STATUS'),
            h('div', { style: { background: stageInfo.bg, color: stageInfo.color, fontSize: '0.95rem', padding: '10px 14px', borderRadius: '8px', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', width: '100%' } }, stageInfo.text)
          )
        ),

        // EXACT ADMIN LIVE AUCTION MONITOR WINDOW SYSTEM (Embedded into Participant Screen)
        h('div', { style: { background: 'rgba(0,0,0,0.5)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--primary-cyan)', marginTop: '1rem', boxShadow: '0 0 15px rgba(0,240,255,0.15)' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
            h('div', { style: { fontSize: '0.8rem', color: 'var(--primary-cyan)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' } }, '📡 LIVE AUCTION MONITOR'),
            h('span', { className: 'brand-tag', style: { background: auc.active ? 'var(--accent-pink)' : 'rgba(255,255,255,0.2)', fontSize: '0.75rem', padding: '3px 8px' } },
              auc.active ? 'AUCTION LIVE 🔥' : 'CLOSED'
            )
          ),

          h('div', { style: { fontSize: '1.15rem', fontWeight: '700', color: 'var(--accent-gold)', lineHeight: '1.4', marginBottom: '6px' } },
            auc.statusMessage
          ),

          h('div', { style: { fontSize: '0.95rem', color: '#fff', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' } },
            h('span', null, 'Current Leader: ', h('strong', { style: { color: 'var(--primary-cyan)' } }, auc.highestBidderName || '- None -')),
            h('span', null, 'Top Amount: ', h('strong', { style: { color: 'var(--accent-gold)' } }, `${auc.highestBid || 0} Coins`))
          )
        ),

        h('div', { className: 'bid-display', style: { marginTop: '1rem' } },
          h('div', { className: 'bid-stat-box' },
            h('div', { className: 'bid-stat-label' }, 'HIGHEST BID'),
            h('div', { className: 'bid-stat-value' }, auc.highestBid || 0)
          ),
          h('div', { className: 'bid-stat-box' },
            h('div', { className: 'bid-stat-label' }, 'HIGHEST BIDDER'),
            h('div', { className: 'bid-stat-value', style: { fontSize: '1.2rem', color: '#fff' } }, auc.highestBidderName || '- None -')
          )
        ),

        // Self-Bidding Warning Banner
        isHighestBidder && auc.active && h('div', { className: 'algo-lock-banner', style: { background: 'rgba(0, 240, 255, 0.15)', borderColor: 'var(--primary-cyan)', marginTop: '1rem' } },
          h('span', { style: { fontSize: '1.5rem' } }, '⭐'),
          h('div', null,
            h('strong', { style: { color: 'var(--primary-cyan)' } }, 'YOU ARE CURRENTLY THE HIGHEST BIDDER!'),
            h('div', { style: { fontSize: '0.85rem', color: '#fff' } },
              'Your team holds the top bid. Bidding is paused for your team until another participant outbids you.'
            )
          )
        ),

        // Auction Closed Banner
        isAuctionClosed && h('div', { className: 'algo-lock-banner', style: { background: 'rgba(255, 215, 0, 0.15)', borderColor: 'var(--accent-gold)', marginTop: '1rem' } },
          h('span', { style: { fontSize: '1.5rem' } }, '🔨'),
          h('div', null,
            h('strong', { style: { color: 'var(--accent-gold)' } }, 'BIDDING COMPLETED FOR THIS ALGORITHM'),
            h('div', { style: { fontSize: '0.85rem', color: '#fff' } },
              'The auction timer has concluded. Waiting for Admin to launch the next algorithm.'
            )
          )
        ),

        // Bidding Control Buttons
        h('div', { className: 'bidding-controls', style: { marginTop: '1rem', opacity: disableBidding ? '0.4' : '1', pointerEvents: disableBidding ? 'none' : 'auto' } },
          h('div', { className: 'quick-bid-btns' },
            h('button', { className: 'btn btn-secondary', disabled: disableBidding, onClick: () => quickBid(10) }, '+10'),
            h('button', { className: 'btn btn-secondary', disabled: disableBidding, onClick: () => quickBid(50) }, '+50'),
            h('button', { className: 'btn btn-secondary', disabled: disableBidding, onClick: () => quickBid(100) }, '+100'),
            h('div', { className: 'custom-bid-group' },
              h('input', { type: 'number', className: 'input-field', disabled: disableBidding, placeholder: 'Custom Bid', value: customBidInput, onChange: e => setCustomBidInput(e.target.value) }),
              h('button', { className: 'btn', disabled: disableBidding, onClick: () => customBidInput && placeBid(parseInt(customBidInput, 10)) }, 'BID')
            )
          )
        )
      ),

      // Right Column: Live Public Bids & Sold Feed
      h('div', { style: { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column' } },
        h('div', { className: 'card-title', style: { marginBottom: '0.8rem', fontSize: '1.1rem' } },
          h('span', null, '📡 Live Public Bids & Sold Feed')
        ),
        h('div', { style: { flex: 1, maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' } },
          bidsHistory.length === 0 ? (
            h('span', { style: { color: 'var(--text-muted)', fontSize: '0.85rem' } }, 'No bids placed yet in this event.')
          ) : (
            bidsHistory.map((item, idx) => (
              item.isSold ? (
                h('div', { key: idx, style: { background: 'rgba(255, 215, 0, 0.15)', border: '1px solid var(--accent-gold)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-gold)' } },
                  `🔨 [${item.timestamp}] SOLD OUT! `, h('strong', null, item.algoName), ` won by `, h('strong', null, item.teamName), ` for ${item.amount} Coins! 🎉`
                )
              ) : (
                h('div', { key: idx, style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem' } },
                  h('span', { style: { color: 'var(--text-muted)' } }, `[${item.timestamp}]`), ' ',
                  h('strong', { style: { color: currentTeam && item.teamName === currentTeam.name ? 'var(--primary-cyan)' : '#fff' } }, item.teamName), ' bid ',
                  h('strong', { style: { color: 'var(--accent-gold)' } }, `${item.amount} Coins`), ' on ', h('em', null, item.algoName)
                )
              )
            ))
          )
        )
      )

    )
  );
}

// -------------------------------------------------------------
// Component 3: QUESTION ARENA VIEW (With Submission Coin Fee & Partial Rewards)
// -------------------------------------------------------------
function QuestionArenaView({ qState, algorithmsCatalog, currentTeam, selectedAlgoId, setSelectedAlgoId, submitAnswer, jumbledAlgosMap, setJumbledAlgosMap }) {
  const q = qState.question;
  const coinsReq = q.coinsRequired !== undefined ? q.coinsRequired : 50;
  const optimalPts = q.rewardPoints !== undefined ? q.rewardPoints : 100;
  const partialPts = q.partialPoints !== undefined ? q.partialPoints : 25;

  const featuredAlgos = useMemo(() => {
    const ids = q.optionAlgoIds || [];
    return ids.map(algoId => {
      return algorithmsCatalog.find(a => a.id === algoId) || { id: algoId, name: 'Algorithm', category: 'General' };
    });
  }, [q.optionAlgoIds, algorithmsCatalog]);

  const teamAlgos = (currentTeam && currentTeam.algorithms) || [];
  const ownedFeaturedIds = useMemo(() => {
    return featuredAlgos.filter(algo => teamAlgos.some(a => a.id === algo.id)).map(a => a.id);
  }, [featuredAlgos, teamAlgos]);

  const displayAlgos = useMemo(() => {
    if (jumbledAlgosMap[q.id]) return jumbledAlgosMap[q.id];
    const clone = [...featuredAlgos];
    for (let i = clone.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    setJumbledAlgosMap(prev => ({ ...prev, [q.id]: clone }));
    return clone;
  }, [q.id, featuredAlgos, jumbledAlgosMap]);

  const teamSub = qState.submissions[currentTeam ? currentTeam.id : ''];
  const hasCoins = currentTeam && currentTeam.coins >= coinsReq;
  const canSubmit = ownedFeaturedIds.length > 0 && !teamSub && hasCoins && (!currentTeam || !currentTeam.eliminated);

  return h('div', { className: 'card', style: { marginTop: '1rem' } },
    h('div', { className: 'card-title', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' } },
      h('span', null, q.title),
      h('div', { style: { display: 'flex', gap: '8px' } },
        h('span', { className: 'coin-badge' }, `🪙 ${coinsReq} Coins Required Fee`),
        h('span', { className: 'coin-badge', style: { background: 'rgba(0,255,157,0.15)', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' } }, `🏆 +${optimalPts} Pts (Optimal)`),
        h('span', { className: 'coin-badge', style: { background: 'rgba(255,170,0,0.15)', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' } }, `🟡 +${partialPts} Pts (Option)`)
      )
    ),

    h('div', { className: 'question-card' },
      h('div', { className: 'question-title' }, 'PROBLEM STATEMENT'),
      h('div', { className: 'question-desc' }, q.description),

      h('div', { style: { marginTop: '1.5rem' } },
        h('div', { className: 'question-title', style: { marginBottom: '0.8rem' } }, 'SELECT ALGORITHM OPTION TO SUBMIT:'),
        
        ownedFeaturedIds.length === 0 ? (
          h('div', { className: 'algo-lock-banner' },
            h('span', { style: { fontSize: '1.5rem' } }, '🔒'),
            h('div', null,
              h('strong', null, 'SUBMISSION LOCKED'),
              h('div', { style: { fontSize: '0.85rem', marginTop: '2px' } },
                'Your team does not possess ANY algorithm featured in this problem\'s choices! Win featured algorithms in the auction to participate.'
              )
            )
          )
        ) : !hasCoins && !teamSub ? (
          h('div', { className: 'algo-lock-banner', style: { background: 'rgba(255,0,85,0.15)', borderColor: 'var(--accent-red)' } },
            h('span', { style: { fontSize: '1.5rem' } }, '⚠️'),
            h('div', null,
              h('strong', { style: { color: 'var(--accent-red)' } }, 'INSUFFICIENT COINS TO SUBMIT ANSWER'),
              h('div', { style: { fontSize: '0.85rem', marginTop: '2px', color: '#fff' } },
                `Submitting an answer to this question requires a fee of 🪙 ${coinsReq} Coins. Your team currently has 🪙 ${currentTeam ? currentTeam.coins : 0} Coins.`
              )
            )
          )
        ) : (
          h('div', { className: 'options-grid' },
            displayAlgos.map((algo, index) => {
              const letter = String.fromCharCode(65 + index);
              const isOwned = teamAlgos.some(a => a.id === algo.id);
              const isSelected = selectedAlgoId === algo.id;

              return h('div', {
                key: algo.id,
                className: `option-card ${isSelected ? 'selected' : ''} ${!isOwned ? 'locked' : ''}`,
                onClick: () => isOwned && !teamSub && hasCoins && setSelectedAlgoId(algo.id),
                style: { cursor: isOwned && !teamSub && hasCoins ? 'pointer' : 'not-allowed', opacity: !isOwned ? 0.4 : 1 }
              },
                h('div', { className: 'option-letter' }, letter),
                h('div', { style: { flex: 1 } },
                  h('div', { className: 'option-text' }, algo.name),
                  h('div', { style: { fontSize: '0.75rem', color: isOwned ? 'var(--accent-green)' : 'var(--accent-red)' } },
                    isOwned ? '✅ Possessed by your team' : '🔒 Locked (Not owned)'
                  )
                )
              );
            })
          )
        ),

        canSubmit && h('button', {
          className: 'btn',
          style: { width: '100%', marginTop: '1.5rem', padding: '12px' },
          disabled: !selectedAlgoId,
          onClick: submitAnswer
        }, `🚀 PAY 🪙 ${coinsReq} COINS & SUBMIT FINAL ANSWER`),

        teamSub && h('div', { className: 'algo-lock-banner', style: { background: 'rgba(0,245,212,0.1)', borderColor: 'var(--accent-green)', marginTop: '1rem' } },
          h('span', { style: { fontSize: '1.5rem' } }, '✅'),
          h('div', null,
            h('strong', { style: { color: 'var(--accent-green)' } }, `ANSWER SUBMITTED! (Paid 🪙 ${teamSub.paidCoins || coinsReq} Coins)`),
            h('div', { style: { fontSize: '0.85rem', color: '#fff' } },
              qState.revealed
                ? (teamSub.isCorrect ? `🎉 OPTIMAL ALGORITHM! +${optimalPts} Points earned!` : `🟡 SUBOPTIMAL CHOICE! +${partialPts} Partial Points earned!`)
                : 'Your answer is locked in. Waiting for Admin to reveal results.'
            )
          )
        )
      )
    )
  );
}

// -------------------------------------------------------------
// Component 4: SCORECARD CARD
// -------------------------------------------------------------
function ScorecardCard({ currentTeam }) {
  if (!currentTeam) return null;
  const won = currentTeam.wonQuestions || [];
  const lost = currentTeam.lostQuestions || [];

  const optimalWon = won.filter(w => w.isOptimal);
  const partialWon = won.filter(w => !w.isOptimal);

  return h('div', { className: 'card', style: { marginTop: '1.5rem' } },
    h('div', { className: 'card-title' },
      h('span', null, `📊 ${currentTeam.name} Official Question Scorecard`)
    ),

    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' } },
      
      // Won Questions Column (Optimal + Partial)
      h('div', { style: { background: 'rgba(0, 255, 157, 0.05)', border: '1px solid var(--accent-green)', padding: '1rem', borderRadius: '10px' } },
        h('h4', { style: { color: 'var(--accent-green)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('span', null, '✅ Solved Questions'),
          h('span', { className: 'coin-badge', style: { fontSize: '0.75rem' } }, `🏆 ${optimalWon.length} Optimal | 🟡 ${partialWon.length} Partial`)
        ),
        won.length === 0 ? (
          h('span', { style: { color: 'var(--text-muted)', fontSize: '0.85rem' } }, 'No solved questions yet.')
        ) : (
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' } },
            won.map((item, i) => h('div', { key: i, style: { fontSize: '0.82rem', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', borderLeft: `3px solid ${item.isOptimal ? 'var(--accent-green)' : 'var(--accent-gold)'}` } },
              h('div', { style: { fontWeight: '700', color: '#fff' } }, item.title),
              h('div', { style: { color: item.isOptimal ? 'var(--accent-green)' : 'var(--accent-gold)', fontSize: '0.75rem' } },
                `${item.isOptimal ? '🏆 Optimal Solution' : '🟡 Suboptimal Option'} • +${item.points} Points • ${item.timestamp}`
              )
            ))
          )
        )
      ),

      // Lost / Missed Questions Column
      h('div', { style: { background: 'rgba(255, 0, 85, 0.05)', border: '1px solid var(--accent-pink)', padding: '1rem', borderRadius: '10px' } },
        h('h4', { style: { color: 'var(--accent-pink)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('span', null, '❌ Unanswered / Locked'),
          h('span', { className: 'brand-tag', style: { background: 'var(--accent-pink)', fontSize: '0.75rem' } }, `${lost.length} Unanswered`)
        ),
        lost.length === 0 ? (
          h('span', { style: { color: 'var(--text-muted)', fontSize: '0.85rem' } }, 'No unanswered questions.')
        ) : (
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' } },
            lost.map((item, i) => h('div', { key: i, style: { fontSize: '0.82rem', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid var(--accent-pink)' } },
              h('div', { style: { fontWeight: '700', color: '#fff' } }, item.title),
              h('div', { style: { color: 'var(--text-muted)', fontSize: '0.75rem' } }, `${item.reason} • ${item.timestamp}`)
            ))
          )
        )
      )

    )
  );
}

// -------------------------------------------------------------
// Component 5: SIDEBAR COMPONENT
// -------------------------------------------------------------
function Sidebar({ currentTeam, teams }) {
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => (b.score || 0) - (a.score || 0) || (b.coins || 0) - (a.coins || 0));
  }, [teams]);

  return h('aside', { className: 'sidebar' },
    
    // Team Portfolio Card
    currentTeam && h('div', { className: 'card' },
      h('div', { className: 'card-title' },
        h('span', null, '💼 Team Inventory')
      ),
      h('div', { style: { fontSize: '0.85rem', marginBottom: '0.5rem' } },
        'Algorithms Acquired: ', h('strong', { style: { color: 'var(--accent-green)' } }, (currentTeam.algorithms || []).length)
      ),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto' } },
        (currentTeam.algorithms || []).length === 0 ? (
          h('span', { style: { color: 'var(--text-muted)', fontSize: '0.8rem' } }, 'No algorithms won in auction yet.')
        ) : (
          currentTeam.algorithms.map(a => h('span', { key: a.id, className: 'algo-badge' },
            a.name, h('span', { style: { fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' } }, `(${a.boughtFor}🪙)`)
          ))
        )
      )
    ),

    // Live Standings Card
    h('div', { className: 'card' },
      h('div', { className: 'card-title' },
        h('span', null, '🏆 Live Team Leaderboard')
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' } },
        sortedTeams.length === 0 ? (
          h('span', { style: { color: 'var(--text-muted)', fontSize: '0.85rem' } }, 'No teams registered yet.')
        ) : (
          sortedTeams.map((team, idx) => {
            const isSelf = currentTeam && team.id === currentTeam.id;
            return h('div', {
              key: team.id,
              style: {
                background: isSelf ? 'rgba(0,240,255,0.1)' : 'rgba(255,255,255,0.03)',
                border: isSelf ? '1px solid var(--primary-cyan)' : '1px solid rgba(255,255,255,0.05)',
                padding: '8px 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: team.eliminated ? 0.5 : 1
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                h('span', { style: { fontWeight: '800', width: '20px', color: idx === 0 ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '0.9rem' } }, `#${idx + 1}`),
                h('div', null,
                  h('div', { style: { fontWeight: '700', fontSize: '0.88rem', color: isSelf ? 'var(--primary-cyan)' : '#fff' } },
                    team.name, team.eliminated && h('span', { className: 'eliminated-badge' }, 'ELIMINATED')
                  ),
                  h('div', { style: { fontSize: '0.72rem', color: 'var(--text-muted)' } }, `${(team.algorithms || []).length} Algos Owned`)
                )
              ),
              h('div', { style: { textAlign: 'right' } },
                h('div', { style: { fontWeight: '700', fontSize: '0.88rem', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' } }, `${team.score || 0} pts`),
                h('div', { style: { fontSize: '0.75rem', color: 'var(--accent-gold)' } }, `🪙 ${team.coins}`)
              )
            );
          })
        )
      )
    )

  );
}

// -------------------------------------------------------------
// Component 6: FINALE MODAL
// -------------------------------------------------------------
function FinaleModal({ teams }) {
  const sorted = useMemo(() => {
    return [...teams].sort((a, b) => (b.score || 0) - (a.score || 0) || (b.coins || 0) - (a.coins || 0));
  }, [teams]);

  const winner = sorted[0];

  return h('div', { className: 'modal-overlay', style: { display: 'flex' } },
    h('div', { className: 'modal-card', style: { maxWidth: '600px', textAlign: 'center' } },
      h('div', { style: { fontSize: '4rem', marginBottom: '0.5rem' } }, '🏆'),
      h('h1', { style: { color: 'var(--accent-gold)', fontSize: '2rem', marginBottom: '0.5rem' } }, 'ALGOAUCT FEST WINNER!'),
      
      winner && h('div', { style: { background: 'rgba(255,215,0,0.15)', border: '2px solid var(--accent-gold)', padding: '1.5rem', borderRadius: '12px', margin: '1rem 0' } },
        h('h2', { style: { color: '#fff', fontSize: '1.8rem', margin: 0 } }, winner.name),
        h('p', { style: { color: 'var(--accent-gold)', fontSize: '1.1rem', margin: '6px 0 0 0', fontWeight: '700' } },
          `Score: ${winner.score || 0} Points | Remaining Coins: 🪙 ${winner.coins}`
        )
      ),

      h('h3', { style: { color: 'var(--primary-cyan)', marginTop: '1.5rem', marginBottom: '0.8rem', fontSize: '1.1rem' } }, 'FINAL EVENT LEADERBOARD'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' } },
        sorted.map((t, idx) => h('div', { key: t.id, style: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.9rem' } },
          h('span', null, `${idx + 1}. ${t.name}`),
          h('strong', { style: { color: 'var(--accent-green)' } }, `${t.score || 0} Points (${t.coins} Coins)`)
        ))
      )
    )
  );
}

// Mount React Root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));
