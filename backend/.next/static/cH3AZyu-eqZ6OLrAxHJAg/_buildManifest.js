self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/",
        "destination": "/home.html"
      },
      {
        "source": "/:page((?!api|_next|assets|styles|scripts|images|admin).*)",
        "destination": "/:page.html"
      },
      {
        "source": "/admin/:page",
        "destination": "/admin/:page.html"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()