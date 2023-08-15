require(['gitbook'], function(gitbook) {
  function addScript(url) {
    var script = document.createElement('script')
    script.src = url
    script.async = 1
    var m = document.getElementsByTagName('script')[0]
    m.parentNode.insertBefore(script, m)
  }

  function insertAfter(newNode, existNode) {
    var parent = existNode.parentNode
    if (parent.lastChild === existNode) {
      parent.appendChild(newNode)
    } else {
      parent.insertBefore(newNode, existNode.nextSibling)
    }
  }

  function addEvent(gtag, category, label, value) {
    gtag('event', 'page', {
      event_category: category,
      event_label: label,
      value: value
    })
  }

  gitbook.events.bind('start', function(e, config) {
    var pluginConfig = config.gtag
    if (pluginConfig) {
      addScript(
        'https://www.googletagmanager.com/gtag/js?id=' + pluginConfig.token
      )
    }
  })

  gitbook.events.bind('page.change', function(e, config) {
    var state = gitbook.state
    var pluginsConfig = state.config.pluginsConfig.gtag
    if (pluginsConfig) {
      window.dataLayer = window.dataLayer || []
      function gtag() {
        dataLayer.push(arguments)
      }
      gtag('js', new Date())

      gtag('config', pluginsConfig.token)
      addEvent(gtag, 'navigate', 'menu', state.chapterTitle)
    }
  })
})
