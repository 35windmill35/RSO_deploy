import { makeAutoObservable } from "mobx";

export class ErrorStore {
  message: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  reset() {
    this.message = null;
  }
  setMessage(value: string | null) {
    if (this.message === value) return;
    this.message = value;
  }
}
