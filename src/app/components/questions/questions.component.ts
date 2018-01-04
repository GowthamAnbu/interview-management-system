import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/timer';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/takeUntil';
import {MatDialog} from '@angular/material';

import { Iquestion, Iquestions} from '../../interfaces/iquestion';
import { SubmitDialogComponent } from '../submit-dialog/submit-dialog.component';

@Component({
  selector: 'app-questions',
  templateUrl: './questions.component.html',
  styleUrls: ['./questions.component.css']
})

export class QuestionsComponent implements OnInit {

private _ticks: number;
private _initialvalue: number;
private _counter: number;
private _subject: Subject<any>;
minutesDisplay: number;
hoursDisplay: number;
secondsDisplay: number;

private _testTaken = false;
private _postData: PostData;
private _index: number;
questions: Iquestion;
private _answerChanged = false;

  constructor(private _router: Router, private _activatedRoute: ActivatedRoute, public dialog: MatDialog) { }

  ngOnInit() {
    this._getQuestions();
  }

  private _setIndex(indexValue: number) {
    this._index = indexValue;
    this._answerChanged = false;
  }

  getIndex(): number {
    return this._index;
  }

  private _setTimerProperties(): void {
    this._ticks = 0;
    this._initialvalue = this.questions.duration;
    this._counter = this._initialvalue * 60;
    this.minutesDisplay = this.hoursDisplay = this.secondsDisplay = 0;
    this._subject = new Subject();
  }

  private _resetTimerProperties(): void {
    this._ticks = this._initialvalue = this._counter = this.minutesDisplay = this.hoursDisplay = this.secondsDisplay = 0;
  }

  private _startTimer() {
    this._setTimerProperties();
    const timer = Observable.timer(1, 1000);
    timer
    .take(this._counter)
    .takeUntil(this._subject)
    .map(() => --this._counter)
    .subscribe(t => this._timer(t));
  }

  private _timer(tick) {
    this._ticks = tick;
    this.hoursDisplay = this._getHours(this._ticks);
    this.minutesDisplay = this._getMinutes(this._ticks);
    this.secondsDisplay = this._getSeconds(this._ticks);
    if (this._counter === 0) {
      this._submit(this.getIndex());  // can create a function to post all answers array :)
      this._router.navigateByUrl('/rounds/1');
    }
  }

  private _getSeconds(ticks: number) {
    return this._padding(ticks % 60);
  }

  private _getMinutes(ticks: number) {
    return this._padding((Math.floor(ticks / 60)) % 60);
  }

  private _getHours(ticks: number) {
    return this._padding(Math.floor((ticks / 60) / 60));
  }

  private _padding(digit: any) {
    return digit <= 9 ? '0' + digit : digit;
  }

  /** returns the initial question object  */
  private _getQuestions() {
    this.questions = this._activatedRoute.snapshot.data['roundQuestions']; console.log(this.questions);
  }

  /* Helper function for UI */
  isTestTaken(): boolean {
    return this._testTaken;
  }

  /**
   * initial function called by button click Take Test
   * toggles testTaken for UI */
  takeTest(): void {
    this._setIndex(0);
    this._initialHit();
    this._testTaken = !this._testTaken;
    this._startTimer();
  }

  /* timer hit after taking the test for security reasons */
  private _initialHit(): void {
    console.log('intial timer Hit');
  }

  /* final timer hit to represent end of test */
  private _finalHit(): void {
    console.log('final timer Hit');
  }

  /**
   * sets the global index
   * tiny little function BIG responsibility  */
  goto(index: number): void {
    this._setIndex(index);
  }

  /** submits data and increase index */
  next(index: number) {
    this._submit(index);
    ++index;
    this.goto(index);
  }

  /** submits the answer by setting answer followed by calling the service function*/
  private _submit(index: number): void {
    if (!this._answerChanged) {
      // console.log('already answered by clicking the radio button for id =>', this.questions.questions[index].question_id);
      return ;
    }
    const data: PostData = this._setPostAnswer(index);
    this._serviceCall(data);
  }

  /* public function to be called by UI which sets the answer string */
  setAnswer(answer: string): void {
    // for the special guy textarea who uses ngmodel
    if (answer === '') {
      this._answerChanged = true;
      return;
    }
    const id = this.getIndex();
    if (this.questions.questions[id].answer !== answer) {
      this._answerChanged = true;
      this.questions.questions[id].answer = answer;
    }
  }

  /* sets the PostAnswer */
  private _setPostAnswer(index: number): PostData {
    const _questionId = this._getQuestionId(index);
    this._postData = {
      round_id: this.questions.round_id,
      question_id: _questionId,
      answer: this.questions.questions[index].answer
    };
    return this._postData;
  }

  /** gets the questionId based on the index given */
  private _getQuestionId(index: number): number {
    return this.questions.questions[index].question_id;
  }

  /** function called by UI to submit last answer  */
  lastSubmit(index: number): void {
    this._submit(index);
    this._stopTimer();
  }

  private _stopTimer() {
    this._subject.next();
    this._resetTimerProperties();
  }

  /** actual api hit or service call  */
  private _serviceCall(payload: PostData): void {
    console.log(payload);
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(SubmitDialogComponent, {
      height: '250px',
      width: '500px',
      data: this._getUnansweredNoOfQuestions()
    });

    dialogRef.afterClosed().subscribe(result => {
      this._afterClosed(result);
    });
  }

  private _getUnansweredNoOfQuestions(): number {
    return this.questions.questions.filter( answer => answer.answer === '').length;
  }

  private _afterClosed(result: boolean): void {
    if (result !== undefined && result === true) {
      this.lastSubmit(this.getIndex()); // instead of getting from UI calling directly; caused by model
      this._router.navigateByUrl('/rounds/1');
    }
  }

  /* ngOnDestroy(): void {
    // Called once, before the instance is destroyed.
    // Add 'implements OnDestroy' to the class.
    this.removeLocalTestTaken();
  } */

}

export interface PostData {
  round_id: number;
  question_id: number;
  answer: string;
}
