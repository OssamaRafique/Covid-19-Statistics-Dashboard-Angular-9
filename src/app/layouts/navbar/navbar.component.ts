import { Component, OnInit, AfterViewInit, Input } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, AfterViewInit {

  @Input() showMobileMenu: boolean;

  constructor() { }

  ngOnInit() {
    this.showMobileMenu = false;
  }

  ngAfterViewInit() {
    // activate menu item based on location
    const links = document.getElementsByClassName('side-nav-link-ref');
    let matchingMenuItem = null;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < links.length; i++) {
      // tslint:disable-next-line: no-string-literal
      if (location.pathname === links[i]['pathname']) {
        matchingMenuItem = links[i];
        break;
      }
    }

    if (matchingMenuItem) {
      matchingMenuItem.classList.add('active');
      const parent = matchingMenuItem.parentElement;

      /**
       * TODO: This is hard coded way of expading/activating parent menu dropdown and working till level 3. 
       * We should come up with non hard coded approach
       */
      if (parent) {
        parent.classList.add('active');
        const parent2 = parent.parentElement;
        if (parent2) {
          parent2.classList.add('in');
        }
        const parent3 = parent2.parentElement;
        if (parent3) {
          parent3.classList.add('active');
          const childAnchor = parent3.querySelector('.has-dropdown');
          if (childAnchor) { childAnchor.classList.add('active'); }
        }

        const parent4 = parent3.parentElement;
        if (parent4) {
          parent4.classList.add('in');
        }
        const parent5 = parent4.parentElement;
        if (parent5) {
          parent5.classList.add('active');
        }
      }
    }
  }

  /**
   * On menu click
   */
  onMenuClick(event: any) {
    const nextEl = event.target.nextSibling;
    if (nextEl && !nextEl.classList.contains('open')) {
      const parentEl = event.target.parentNode;
      if (parentEl) { parentEl.classList.remove('open'); }

      nextEl.classList.add('open');
    } else if (nextEl) { nextEl.classList.remove('open'); }
    return false;
  }
}
