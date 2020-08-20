import { call, put, takeLatest, takeEvery } from 'redux-saga/effects'

import * as collectionActions from './actions'
import { fetchUserByHandle } from 'store/cache/users/sagas'
import { retrieveCollections } from 'store/cache/collections/utils'
import * as cacheActions from 'store/cache/actions'
import { Kind } from 'store/types'

import tracksSagas from 'containers/collection-page/store/lineups/tracks/sagas.js'
import { tracksActions } from 'containers/collection-page/store/lineups/tracks/actions.js'
import { makeUid } from 'utils/uid'

function* watchFetchCollection() {
  yield takeLatest(collectionActions.FETCH_COLLECTION, function* (action) {
    const collectionId = action.id
    const handle = action.handle

    const user = yield call(fetchUserByHandle, handle)
    if (!user) {
      yield put(collectionActions.fetchCollectionFailed())
    }
    const userUid = makeUid(Kind.USERS, user.user_id)

    // Retrieve collections and fetch nested tracks
    const { collections, uids: collectionUids } = yield call(
      retrieveCollections,
      user.user_id,
      [collectionId],
      true
    )

    if (Object.values(collections).length === 0) {
      yield put(collectionActions.fetchCollectionFailed(userUid))
    }
    const collection = collections[collectionId]
    const collectionUid = collectionUids[collectionId]
    if (collection) {
      yield put(
        cacheActions.subscribe(Kind.USERS, [{ uid: userUid, id: user.user_id }])
      )
      yield put(
        collectionActions.fetchCollectionSucceeded(
          collection.playlist_id,
          collectionUid,
          userUid,
          collection.playlist_contents.track_ids.length
        )
      )
    } else {
      yield put(collectionActions.fetchCollectionFailed(userUid))
    }
  })
}

function* watchResetCollection() {
  yield takeEvery(collectionActions.RESET_COLLECTION, function* (action) {
    yield put(tracksActions.reset())
    yield put(
      cacheActions.unsubscribe(Kind.COLLECTIONS, [
        { uid: action.collectionUid }
      ])
    )
    yield put(cacheActions.unsubscribe(Kind.USERS, [{ uid: action.userUid }]))
  })
}

export default function sagas() {
  return [...tracksSagas(), watchFetchCollection, watchResetCollection]
}