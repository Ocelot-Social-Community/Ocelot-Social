export default {
  SHOW_HEADER_MENU: true,
  MENU: [
    {
      name: 'Themen',
      path: '/#',
    },
    {
      name: 'Gruppen',
      path: '/#',
      children: [
        {
          name: 'Gruppe 1',
          path: '/#',
        },
        {
          name: 'Gruppe 2',
          path: '/#',
        },
      ],
    },
    {
      name: 'Über Yunite',
      path: '/#',
      children: [
        {
          name: 'Impressum',
          path: '/#',
        },
        {
          name: 'Yunite Team',
          path: '/#',
        },
      ],
    },
  ],
}
