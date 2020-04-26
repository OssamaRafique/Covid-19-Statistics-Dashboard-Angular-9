import {
  Component,
  OnInit,
  NgZone,
  OnDestroy,
  DoCheck
} from '@angular/core';
import COUNTRY_CODES from "../../shared/utils/countries"

import {
  ActivatedRoute
} from "@angular/router";

import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";

import {
  GetdataService
} from "./../../core/services/getdata.service";
import {
  combineLatest
} from 'rxjs';
import { TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'app-country',
  templateUrl: './country.component.html',
  styleUrls: ['./country.component.scss']
})
export class CountryComponent implements OnInit, OnDestroy, DoCheck {
  private pieChart: am4charts.PieChart;
  private lineChart: am4charts.XYChart;
  private radarChart: am4charts.RadarChart

  public isLoading: boolean = true;

  public timeLine;

  public totalCases=0;
  public totalDeaths=0;
  public totalRecoveries;
  public totalCritical=0;
  public todayCases=0;
  public todayDeaths=0;
  public activeCases=0;
  public casesPer1M=0;
  public finishedCases=0;
  public countryCodes = COUNTRY_CODES;
  public country: any;
  public translations : any = {};

  constructor(private route: ActivatedRoute, private _getDataService: GetdataService, private zone: NgZone, public translate : TranslateService) {}



  
  ngOnDestroy() {
    this.zone.runOutsideAngular(() => {
      if (this.pieChart) {
        this.pieChart.dispose();
      }
      if (this.lineChart) {
        this.lineChart.dispose();
      }
      if (this.radarChart) {
        this.radarChart.dispose();
      }
    });
  }
  async ngDoCheck() {
    this.translate.get(['Shared.Other.14', 'Shared.Other.15', 'Shared.Other.16', 'Shared.Other.17', 'Shared.TopCards.1', 'Shared.TopCards.3', 'Shared.TopCards.4'])
    .subscribe(translations => {
      this.setTranslations(translations);
      return 0;
    });
  }
  
  ngOnInit() {
    let nameTimeline = this.route.snapshot.paramMap.get("name").toLowerCase();
    if (nameTimeline == "usa") {
      nameTimeline = "us";
    } else if(nameTimeline == "taiwan"){
      nameTimeline = "taiwan*";
    } else if(nameTimeline == "isle of man"){
      nameTimeline = "united kingdom";
    } else if(nameTimeline == "aruba"){
      nameTimeline = "netherlands";
    } else if(nameTimeline == "sint maarten"){
      nameTimeline = "netherlands";
    } else if(nameTimeline == "st. vincent grenadines"){
      nameTimeline = "saint vincent and the grenadines";
    } else if(nameTimeline == "timor-leste"){
      nameTimeline = "East Timor";
    } else if(nameTimeline == "montserrat"){
      nameTimeline = "united kingdom";
    } else if(nameTimeline == "gambia"){
      nameTimeline = "gambia, the";
    } else if(nameTimeline == "cayman islands"){
      nameTimeline = "united kingdom";
    } else if(nameTimeline == "bermuda"){
      nameTimeline = "united kingdom";
    } else if(nameTimeline == "greenland"){
      nameTimeline = "denmark";
    } else if(nameTimeline == "st. barth"){
      nameTimeline = "saint barthelemy";
    } else if(nameTimeline == "congo"){
      nameTimeline = "congo (brazzaville)";
    } else if(nameTimeline == "saint martin"){
      nameTimeline = "france";
    } else if(nameTimeline == "gibraltar"){
      nameTimeline = "united kingdom";
    } else if(nameTimeline == "mayotte"){
      nameTimeline = "france";
    } else if(nameTimeline == "bahamas"){
      nameTimeline = "bahamas, the";
    } else if(nameTimeline == "french guiana"){
      nameTimeline = "france";
    } else if(nameTimeline == "u.s. virgin islands"){
      nameTimeline = "us";
    } else if(nameTimeline == "curaçao"){
      nameTimeline = "netherlands";
    } else if(nameTimeline == "puerto rico"){
      nameTimeline = "us";
    } else if(nameTimeline == "french polynesia"){
      nameTimeline = "france";
    } else if(nameTimeline == "ivory coast"){
      nameTimeline = "Cote d'Ivoire";
    } else if(nameTimeline == "macao"){
      nameTimeline = "china";
    } else if(nameTimeline == "drc"){
      nameTimeline = "congo (kinshasa)";
    } else if(nameTimeline == "channel islands"){
      nameTimeline = "united kingdom";
    } else if(nameTimeline == "réunion"){
      nameTimeline = "france";
    } else if(nameTimeline == "guadeloupe"){
      nameTimeline = "france";
    } else if(nameTimeline == "faeroe islands"){
      nameTimeline = "Denmark";
    } else if(nameTimeline == "uae"){
      nameTimeline = "United Arab Emirates";
    } else if(nameTimeline == "diamond princess"){
      nameTimeline = "australia";
    } else if(nameTimeline == "hong kong"){
      nameTimeline = "china";
    } else if(nameTimeline == "uk"){
      nameTimeline = "united kingdom";
    } else if(nameTimeline == "car"){
      nameTimeline = "central african republic";
    }
    this.zone.runOutsideAngular(() => {
      combineLatest(
        this._getDataService.getCountry(this.route.snapshot.paramMap.get("name")),
        this._getDataService.getTimelineCountry(nameTimeline)
        )
        .subscribe(([getAllData, getTimelineData]) => {
          this.isLoading = false;
          this.country = getAllData;
          this.totalCases = getAllData["cases"];
          this.totalDeaths = getAllData["deaths"];
          this.totalRecoveries = getAllData["recovered"];
          this.totalCritical = getAllData["critical"];
          this.todayCases = getAllData["todayCases"];
          this.todayDeaths = getAllData["todayDeaths"];
          this.activeCases = getAllData["active"];
          this.casesPer1M = getAllData["casesPerOneMillion"];
          this.finishedCases = this.totalDeaths + this.totalRecoveries;
          this.timeLine = getTimelineData;
          this.loadPieChart();
          this.loadLineChart();
          this.loadRadar();
        });
    });
  }

  loadLineChart() {
    let caseData = [];
    if (!this.timeLine.multiple) {
      caseData = this.timeLine.data.timeline;
    } else {
      let data = {};
      this.timeLine.data.forEach(async element => {
        element.timeline.forEach(async o => {
          if(!data.hasOwnProperty(o.date)){
            data[o.date] = {};
            data[o.date]["cases"] = 0;
            data[o.date]["deaths"] = 0;
            data[o.date]["recovered"] = 0;
          }
          data[o.date].cases += parseInt(o.cases);
          data[o.date].deaths += parseInt(o.deaths);
          data[o.date].recovered += parseInt(o.recovered);
        });
      });
      Object.keys(data).forEach(key => {
        caseData.push({
          date: new Date(key),
          cases: data[key].cases,
          recovered: data[key].recovered,
          deaths: data[key].deaths
        });
      });
    }
    caseData.push({
      date: new Date().getTime(),
      cases: this.totalCases,
      recovered: this.totalRecoveries,
      deaths: this.totalDeaths
    });
    let chart = am4core.create("lineChart", am4charts.XYChart);
    chart.numberFormatter.numberFormat = "#a";
    chart.numberFormatter.bigNumberPrefixes = [
      { "number": 1e+3, "suffix": "K" },
      { "number": 1e+6, "suffix": "M" },
      { "number": 1e+9, "suffix": "B" }
    ];
    
    // Create axes
    let dateAxis = chart.xAxes.push(new am4charts.DateAxis());
    dateAxis.renderer.minGridDistance = 50;

    let valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    
    valueAxis.renderer.labels.template.fill = am4core.color("#adb5bd");
    dateAxis.renderer.labels.template.fill = am4core.color("#adb5bd");

    chart = this.createSeriesLine(chart, "#21AFDD", "cases");
    chart = this.createSeriesLine(chart, "#10c469", "recovered");
    chart = this.createSeriesLine(chart, "#ff5b5b", "deaths");

    chart.data = caseData;

    chart.legend = new am4charts.Legend();
    chart.legend.labels.template.fill = am4core.color("#adb5bd");

    chart.cursor = new am4charts.XYCursor();
    
    this.lineChart = chart;
  }
  loadPieChart() {
    let chart = am4core.create("pieChart", am4charts.PieChart);
    chart.data.push({
      type: 'Recoveries',
      number: this.totalRecoveries,
      "color": am4core.color("#10c469")
    });
    chart.data.push({
      type: 'Deaths',
      number: this.totalDeaths,
      "color": am4core.color("#ff5b5b")
    });
    chart.data.push({
      type: 'Critical',
      number: this.totalCritical,
      "color": am4core.color("#f9c851")
    });
    let pieSeries = chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = "number";
    pieSeries.dataFields.category = "type";
    pieSeries.labels.template.disabled = true;
    pieSeries.ticks.template.disabled = true;
    pieSeries.slices.template.propertyFields.fill = "color";
    pieSeries.slices.template.stroke = am4core.color("#313a46");
    pieSeries.slices.template.strokeWidth = 1;
    pieSeries.slices.template.strokeOpacity = 1;
    this.pieChart = chart;
  }

  
  loadRadar() {
    let chart = am4core.create("radarChart", am4charts.RadarChart);

    // Add data
    chart.data = [{
      "category": this.translations.critical,
      "value": this.totalCritical / this.activeCases * 100,
      "full": 100
    }, {
      "category": this.translations.deaths,
      "value": this.totalDeaths / this.finishedCases * 100,
      "full": 100
    }, {
      "category": this.translations.recovered,
      "value": this.totalRecoveries / this.finishedCases * 100,
      "full": 100
    }, {
      "category": this.translations.active,
      "value": 100 - (this.totalCritical / this.activeCases * 100),
      "full": 100
    }];

    // Make chart not full circle
    chart.startAngle = -90;
    chart.endAngle = 180;
    chart.innerRadius = am4core.percent(20);

    // Set number format
    chart.numberFormatter.numberFormat = "#.#'%'";

    // Create axes
    let categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis < am4charts.AxisRendererRadial > ());
    categoryAxis.dataFields.category = "category";
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.grid.template.strokeOpacity = 0;
    categoryAxis.renderer.labels.template.horizontalCenter = "right";
    categoryAxis.renderer.labels.template.adapter.add("fill", function (fill, target) {
      if (target.dataItem.index == 0) {
        return am4core.color("#f9c851");
      }
      if (target.dataItem.index == 1) {
        return am4core.color("#ff5b5b");
      }
      if (target.dataItem.index == 2) {
        return am4core.color("#10c469");
      }
      return am4core.color("#21AFDD");
    });
    categoryAxis.renderer.minGridDistance = 10;

    let valueAxis = chart.xAxes.push(new am4charts.ValueAxis < am4charts.AxisRendererCircular > ());
    valueAxis.renderer.grid.template.strokeOpacity = 0;
    valueAxis.min = 0;
    valueAxis.max = 100;
    valueAxis.strictMinMax = true;

    valueAxis.renderer.labels.template.fill = am4core.color("#adb5bd");

    // Create series
    let series1 = chart.series.push(new am4charts.RadarColumnSeries());
    series1.dataFields.valueX = "full";
    series1.dataFields.categoryY = "category";
    series1.clustered = false;
    series1.columns.template.fill = new am4core.InterfaceColorSet().getFor("alternativeBackground");
    series1.columns.template.fillOpacity = 0.08;
    series1.columns.template["cornerRadiusTopLeft"] = 20;
    series1.columns.template.strokeWidth = 0;
    series1.columns.template.radarColumn.cornerRadius = 20;

    let series2 = chart.series.push(new am4charts.RadarColumnSeries());
    series2.dataFields.valueX = "value";
    series2.dataFields.categoryY = "category";
    series2.clustered = false;
    series2.columns.template.strokeWidth = 0;
    series2.columns.template.tooltipText = "{category}: [bold]{value}[/]";
    series2.columns.template.radarColumn.cornerRadius = 20;

    series2.columns.template.adapter.add("fill", function (fill, target) {
      //return chart.colors.getIndex(target.dataItem.index);
      if (target.dataItem.index == 0) {
        return am4core.color("#f9c851");
      }
      if (target.dataItem.index == 1) {
        return am4core.color("#ff5b5b");
      }
      if (target.dataItem.index == 2) {
        return am4core.color("#10c469");
      }
      return am4core.color("#21AFDD");
    });

    // Add cursor
    chart.cursor = new am4charts.RadarCursor();
    chart.cursor.fill = am4core.color("#282e38");
    chart.tooltip.label.fill = am4core.color("#282e38");

    this.radarChart = chart;
  }
  createSeriesLine(chart, color, type) {
    let name = null;
    if(type=="cases"){
      name = this.translations.cases;
    } else if(type=="recoveries"){
      name = this.translations.recovered;
    } else if(type=="deaths"){
      name = this.translations.deaths;
    }
    if(!name){
      name = type.charAt(0).toUpperCase() + type.slice(1);
    }
    let series = chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueY = type;
    series.fill = am4core.color(color);
    series.dataFields.dateX = "date";
    series.strokeWidth = 2;
    series.minBulletDistance = 10;
    series.tooltipText = "{valueY} " + name;
    series.tooltip.pointerOrientation = "vertical";

    series.tooltip.background.cornerRadius = 20;
    series.tooltip.background.fillOpacity = 0.5;

    series.stroke = am4core.color(color);
    series.legendSettings.labelText = name;
    series.tooltip.autoTextColor = false;
    series.tooltip.label.fill = am4core.color("#282e38");
    return chart
  }
  async setTranslations(translations){
    this.translations.active = translations['Shared.Other.14'];
    this.translations.recovered = translations['Shared.Other.15'];
    this.translations.deaths = translations['Shared.Other.16'];
    this.translations.critical = translations['Shared.Other.17'];
    this.translations.cases = translations['Shared.Other.14'];
  }
}