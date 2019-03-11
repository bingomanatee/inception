import {catchError, map, switchMap} from 'rxjs/operators';
import {of} from 'rxjs';

export default function catchFactory(bottle) {
  bottle.constant('noop', (a) => a);

  const defaultCatcher = (err) => ({error: err, defaultCatcher: true});

  /**
   * Maps the output to a function that can throw errors.
   * Re-maps error output to the catcher function.
   * The resulting subscriber has pseudo-promise syntax
   * that lets you set the mapper
   */
  bottle.factory('rxCatch', ({noop}) => {
    return (observable, mapper = noop, catcher = defaultCatcher) => {
      return observable.pipe(
        switchMap(
          response => of(response)
            .pipe(
              map(mapper),
              catchError(error => of(catcher(error))))
        ));
    }
  })
}
