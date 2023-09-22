const { capitalizeFirstLetter, camelToSnake } = require('./helpers');
const recast = require('recast');
const { objectProperty, identifier, stringLiteral, literal, objectExpression } =
  recast.types.builders;

const getPropertyByKey = (properties, key) =>
  properties.filter(({ key: { name } }) => key === name);

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

  recast.visit(actionsAst, {
    visitExportDefaultDeclaration(path) {
      if (path.node.declaration.type === 'ObjectExpression') {
        path.node.declaration.properties.push(node);
      }
      this.traverse(path);
    },
  });

  return recast.print(actionsAst).code;
};

/**
 * Return state.js code with the new property
 * @param {*} param0
 * @returns
 */
const createOrAddProperty = ({ propertyPath, value }, ast) => {
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
  recast.visit(mutationTypesAst, {
    visitExportDefaultDeclaration(path) {
      if (path.node.declaration.type === 'ObjectExpression') {
        const newType = objectProperty(
          identifier(mutationName),
          stringLiteral(mutationName)
        );
        path.node.declaration.properties.push(newType);
      }
      this.traverse(path);
    },
  });

  return recast.print(mutationTypesAst).code;
};

const createMutation = (name, mutationsAst) => {
  const node = extractNode(`[types.${name}](state, payload) {
	state.allFiltersPerTenant = payload;
  }`);

  recast.visit(mutationsAst, {
    visitExportDefaultDeclaration(path) {
      if (path.node.declaration.type === 'ObjectExpression') {
        path.node.declaration.properties.push(node);
      }
      this.traverse(path);
    },
  });

  return recast.print(mutationsAst).code;
};

export {
  createAction,
  createOrAddProperty,
  createMutationType,
  createMutation,
};
