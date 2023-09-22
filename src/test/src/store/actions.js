import types from './mutationTypes';

export default {
  setMyDefaultProp({ commit }, payload) {
    commit(types.SET_MY_DEFAULT_PROP, payload);
  },
};
