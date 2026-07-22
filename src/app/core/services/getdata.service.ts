import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry, catchError, delay } from 'rxjs/operators';
import { Country } from '../models/country';
import { Observable, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  getDemoCountries,
  getDemoCountry,
  getDemoTimeline,
  getDemoCountryTimeline,
  getDemoGlobalTimeline
} from '../mock/demo-data';

HttpClient
@Injectable({
  providedIn: 'root'
})
export class GetdataService {

  constructor(private _http: HttpClient) { }
  private host = environment.apiHost;

  getAll(type): Observable<Country>{
    if (environment.useDummyData) {
      return this.demo(getDemoCountries(type));
    }
    return this._http.get<Country>(`${this.host}/countries?sort=${type}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }
  getCountry(name): Observable<Country>{
    if (environment.useDummyData) {
      return this.demo(getDemoCountry(name));
    }
    return this._http.get<Country>(`${this.host}/countries/${name}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }
  getTimeline(){
    if (environment.useDummyData) {
      return this.demo(getDemoTimeline());
    }
    return this._http.get(`${this.host}/timeline`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }
  getTimelineCountry(country){
    if (environment.useDummyData) {
      return this.demo(getDemoCountryTimeline(country));
    }
    return this._http.get(`${this.host}/timeline/${country}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }
  getTimelineGlobal(){
    if (environment.useDummyData) {
      return this.demo(getDemoGlobalTimeline());
    }
    return this._http.get(`${this.host}/timeline/global`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Serves generated sample data in place of an HTTP call. The small delay keeps the loading
   * spinners on screen for a moment, so the demo behaves like the live dashboard did.
   */
  private demo(data): any {
    return of(data).pipe(delay(400));
  }

  handleError(error) {
    let errorMessage = '';
    if(error.error instanceof ErrorEvent) {
      // Get client-side error
      errorMessage = error.error.message;
    } else {
      // Get server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    window.alert("Please check your internet connection!.");
    return throwError(errorMessage);
 }
}
