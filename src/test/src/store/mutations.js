import types from './mutationTypes';

export default {
  [types.SET_MY_DEFAULT_PROP](state, payload) {
    state.myDefaultProp = payload;
  },
};
