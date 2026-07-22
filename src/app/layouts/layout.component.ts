import { Component, OnInit, AfterViewInit } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, AfterViewInit {

  showMobileMenu = false;

  // Hidden automatically for anyone running against a real API.
  showDemoNotice = environment.useDummyData;

  constructor() { }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }
}
