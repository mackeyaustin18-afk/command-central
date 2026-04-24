const DATA = {
  emails: [
    { id:1, from:'Sarah Reynolds', initials:'SR', avatarBg:'#e8f0fe', avatarColor:'#1a73e8', subject:'Q2 planning doc — can you review?', time:'9:14 am', unread:true },
    { id:2, from:'Tyler Kim', initials:'TK', avatarBg:'#e1f5ee', avatarColor:'#0f6e56', subject:'Re: Weekend project update', time:'8:02 am', unread:true },
    { id:3, from:'Newsletter digest', initials:'NL', avatarBg:'#faeeda', avatarColor:'#854f0b', subject:'Your weekly reads are ready', time:'7:30 am', unread:false },
  ],
  events: [
    { id:1, name:'Deep work block', time:'11:00 am', detail:'Focus time · 2 hrs', color:'#1d9e75', day:'Today' },
    { id:2, name:'Gym', time:'6:00 pm', detail:'Personal · 1 hr', color:'#ba7517', day:'Today' },
  ],
  tasks: [
    { id:1, text:'Review PawZen product catalog', tag:'today', done:false },
    { id:2, text:'Check trading bot status', tag:'today', done:false },
    { id:3, text:'Publish next blog post', tag:'week', done:false },
  ],
  files: [
    { name:'PawZen planning.gdoc', meta:'Modified 2 hrs ago · Shared', icon:'D', iconBg:'#e8f0fe', iconColor:'#1a73e8' },
    { name:'Finance ledger.gsheet', meta:'Modified yesterday', icon:'S', iconBg:'#e1f5ee', iconColor:'#0f6e56' },
  ],
  projects: [
    {
      id: 1,
      name: 'PawZen Vibes',
      description: 'Shopify store — digital dog care products. Primary focus for next 30 days.',
      status: 'active',
      updated: 'Today',
      links: [
        { label: 'Store', url: 'https://pawzenvibes.com', type: 'deploy' },
        { label: 'Admin', url: 'https://bq0xey-rg.myshopify.com/admin', type: 'admin' }
      ],
      color: '#5b4fe8',
      initials: 'PZ'
    },
    {
      id: 2,
      name: 'Trading Bots',
      description: 'Automated trading — 3 containers active, DCA paused.',
      status: 'active',
      updated: 'Today',
      links: [],
      color: '#1a9e75',
      initials: 'TB'
    }
  ]
};
