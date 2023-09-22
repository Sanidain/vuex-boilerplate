const input = { propertyPath: 'test.test2', value: 24 };
const fs = require('fs');
const path = require('path');
const {
  createAction,
  createMutation,
  createMutationType,
  createGetter,
  createStateProperty,
} = require('./utility');

const getFilepaths = () => {
  const statePath = path.resolve(__dirname, 'store/state.js');
  const mutationsPath = path.resolve(__dirname, 'store/mutations.js');
  const mutationTypesPath = path.resolve(__dirname, 'store/mutationTypes.js');
  const actionsPath = path.resolve(__dirname, 'store/actions.js');
  const gettersPath = path.resolve(__dirname, 'store/getters.js');

  return {
    statePath,
    mutationsPath,
    mutationTypesPath,
    actionsPath,
    gettersPath,
  };
};

const getOriginalCode = () => {
  const {
    statePath,
    mutationsPath,
    mutationTypesPath,
    actionsPath,
    gettersPath,
  } = getFilepaths();

  const stateOriginalCode = fs.readFileSync(statePath, 'utf-8');
  const mutationsOriginalCode = fs.readFileSync(mutationsPath, 'utf-8');
  const mutationTypesOriginalCode = fs.readFileSync(mutationTypesPath, 'utf-8');
  const actionsOriginalCode = fs.readFileSync(actionsPath, 'utf-8');
  const gettersOriginalCode = fs.readFileSync(gettersPath, 'utf-8');

  return {
    stateOriginalCode,
    mutationsOriginalCode,
    mutationTypesOriginalCode,
    actionsOriginalCode,
    gettersOriginalCode,
  };
};

getOriginalAsts = () => {
  const {
    stateOriginalCode,
    mutationsOriginalCode,
    mutationTypesOriginalCode,
    actionsOriginalCode,
    gettersOriginalCode,
  } = getOriginalCode();

  return {
    stateOriginalAst: recast.parse(stateOriginalCode),
    mutationsOriginalAst: recast.parse(mutationsOriginalCode),
    mutationTypesOriginalAst: recast.parse(mutationTypesOriginalCode),
    actionsOriginalAst: recast.parse(actionsOriginalCode),
    gettersOriginalAst: recast.parse(gettersOriginalCode),
  };
};

const getNewCode = () => {
  const {
    stateOriginalAst,
    mutationsOriginalAst,
    mutationTypesOriginalAst,
    actionsOriginalAst,
    gettersOriginalAst,
  } = getOriginalAsts();

  const finalDepth = input.propertyPath.split('.').pop();

  return {
    stateNewCode: createStateProperty(input, stateOriginalAst),
    mutationTypesNewCode: createMutationType(
      finalDepth,
      mutationTypesOriginalAst
    ),
    mutationsNewCode: createMutation(input.propertyPath, mutationsOriginalAst),
    gettersNewCode: createGetter(finalDepth, gettersOriginalAst),
    actionsNewCode: createAction(finalDepth, actionsOriginalAst),
  };
};

const generateAndWriteNewCode = () => {
  const {
    statePath,
    mutationTypesPath,
    mutationsPath,
    gettersPath,
    actionsPath,
  } = getFilepaths();

  const {
    stateNewCode,
    mutationTypesNewCode,
    mutationsNewCode,
    gettersNewCode,
    actionsNewCode,
  } = getNewCode();

  fs.writeFileSync(statePath, stateNewCode, 'utf-8');
  fs.writeFileSync(mutationTypesPath, mutationTypesNewCode, 'utf-8');
  fs.writeFileSync(mutationsPath, mutationsNewCode, 'utf-8');
  fs.writeFileSync(gettersNewCode, gettersPath, 'utf-8');
  fs.writeFileSync(actionsPath, actionsNewCode, 'utf-8');
};


generateAndWriteNewCode();