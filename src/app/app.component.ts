import { Component } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  constructor(public translate: TranslateService) {
    translate.addLangs(["en", "fr", "de", "tr"]);
    translate.setDefaultLang("en");
    const browserLang = translate.getBrowserLang();
    translate.use(browserLang.match(/en|de|tr|fr/) ? browserLang : "en");
  }
}
