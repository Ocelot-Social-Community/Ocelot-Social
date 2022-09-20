export default {
  SHOW_HEADER_MENU: true,
  MENU: [
    {
      name: 'Beiträge',
      path: '/#',
    },
    {
      name: 'Themen',
      path: '/#',
    },
    {
      name: 'Gruppen',
      path: '/#',
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
