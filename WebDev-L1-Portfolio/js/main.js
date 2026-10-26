(function () {
  "use strict";

  var yearTarget = document.querySelector("[data-year]");
  if (yearTarget) {
    yearTarget.textContent = String(new Date().getFullYear());
  }

  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav__links a[href^='#']")
  );

  var pairs = navLinks
    .map(function (link) {
      var hash = link.getAttribute("href");
      var section = hash && hash.length > 1 ? document.querySelector(hash) : null;
      return section ? { link: link, section: section } : null;
    })
    .filter(Boolean);

  if (!("IntersectionObserver" in window) || pairs.length === 0) {
    return;
  }

  var activeLink = null;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        var match = pairs.filter(function (pair) {
          return pair.section === entry.target;
        })[0];

        if (!match || match.link === activeLink) {
          return;
        }

        if (activeLink) {
          activeLink.removeAttribute("aria-current");
        }
        match.link.setAttribute("aria-current", "true");
        activeLink = match.link;
      });
    },
    { rootMargin: "-38% 0px -52% 0px", threshold: 0 }
  );

  pairs.forEach(function (pair) {
    observer.observe(pair.section);
  });
})();
