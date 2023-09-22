const { capitalizeFirstLetter, camelToSnake } = require('./helpers');
const recast = require('recast');
const { objectProperty, identifier, stringLiteral, literal, objectExpression } =
  recast.types.builders;

const getPropertyByKey = (properties, key) =>
  properties.filter(({ key: { name } }) => key === name);

  /**
 * Returns modified ast with the added node
 * @param {*} node 
 * @param {*} ast 
 */
const addToDefaultExport = (node, ast) => {
  recast.visit(ast, {
    visitExportDefaultDeclaration(path) {
      if (path.node.declaration.type === 'ObjectExpression') {
        path.node.declaration.properties.push(node);
      }
      this.traverse(path);
    },
  });

  return ast;
};

const extractNode = (code) => {
  const [ast] = recast.parse(`
	export default {
	  ${code}
	}
	`).program.body;

  let node;

  recast.visit(ast, {
    visitExportDefaultDeclaration(path) {
      if (path.node.declaration.type === 'ObjectExpression') {
        // path.node.declaration.properties.push(mutation);
        node = path.node.declaration.properties[0];
      }
      this.traverse(path);
    },
  });

  return node;
};

const createNestedObj = (pathArr, value) => {
  let newProperty = literal(value);

  for (let i = pathArr.length - 1; i >= 0; i--) {
    newProperty =
      i === pathArr.length - 1
        ? objectProperty(identifier(pathArr[i]), newProperty)
        : objectProperty(
            identifier(pathArr[i]),
            objectExpression([newProperty])
          );
  }
  return newProperty;
};

const checkForProperty = (index, prevProperty, pathArr, value) => {
  if (index === pathArr.length) return;

  const [property] = getPropertyByKey(
    // checkForProperty is only called when
    // prevProperty is of type ObjectExpression
    prevProperty.value.properties,
    pathArr[index]
  );

  if (property) {
    if (property.value.type === 'ObjectExpression') {
      checkForProperty(index + 1, property, pathArr, value);
    } else {
      if (index === pathArr.length - 1) {
        console.log('override the property');
        // override the property
      }
      throw error("Property already exists and it's not an object");
    }
  } else {
    prevProperty.value.properties.push(
      createNestedObj(pathArr.slice(index), value)
    );
  }
};

/**
 *
 * @param {*} actionName
 * @returns Returns code with added action
 */
const createAction = (actionName, actionsAst) => {
  const node = extractNode(`set${capitalizeFirstLetter(
    actionName
  )}({ commit }, payload) {
		  commit(types.${camelToSnake(actionName)}, payload);
		},`);

    return recast.print(addToDefaultExport(node, actionsAst)).code;
};

/**
 * Return state.js code with the new property
 * @param {*} param0
 * @returns
 */
const createStateProperty = ({ propertyPath, value }, ast) => {
  const pathArr = propertyPath?.split('.');

  // COMPOSITE PATH
  if (pathArr.length > 1) {
    recast.visit(ast, {
      visitExportDefaultDeclaration(path) {
        if (path.node.declaration.type === 'ObjectExpression') {
          const [property] = getPropertyByKey(
            path.node.declaration.properties,
            pathArr[0]
          );

          if (property) {
            checkForProperty(1, property, pathArr, value);
          } else {
            path.node.declaration.properties.push(
              createNestedObj(pathArr, value)
            );
          }
        }
        this.traverse(path);
      },
    });

    // SIMPLE PATH
  } else {
    recast.visit(ast, {
      visitExportDefaultDeclaration(path) {
        if (path.node.declaration.type === 'ObjectExpression') {
          if (
            path.node.declaration.properties.some(
              (prop) => prop.key.name === propertyPath
            )
          ) {
            this.traverse(path);
            throw new Error(
              `This property already exists at the path ${propertyPath}`
            );
          } else {
            const newProperty = objectProperty(
              identifier(propertyPath),
              literal(null)
            );

            path.node.declaration.properties.push(newProperty);
          }
        }
        this.traverse(path);
      },
    });
  }

  return recast.print(ast).code;
};

/**
 * Returns code with added mutation type
 * @param {*} mutationName
 * @param {*} mutationTypesAst
 * @returns
 */
const createMutationType = (mutationName, mutationTypesAst) => {
  const node = objectProperty(
          identifier(mutationName),
          stringLiteral(mutationName)
        );

  return recast.print(addToDefaultExport(node, mutationTypesAst)).code;
}

const createMutation = (propertyPath, mutationsAst) => {
  const finalDepth = propertyPath.split('.').pop();

  const node = extractNode(`[types.SET_${camelToSnake(finalDepth)}](state, payload) {
	state[${propertyPath}] = payload;
  }`);

  return recast.print(addToDefaultExport(node, mutationsAst)).code;
};



const createGetter = (name, gettersAst) =>{
  const node = extractNode(`${name}: (state) => state.name`)

  return recast.print(addToDefaultExport(node, gettersAst)).code;
}

export {
  createAction,
  createStateProperty,
  createMutationType,
  createMutation,
  createGetter,
};
