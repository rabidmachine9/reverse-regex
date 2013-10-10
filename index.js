module.exports = ReverseRegex;

function ReverseRegex(regex){
  this.specialTokens = ['{','[','('];
  this.matchingSpecialToken = ['}', ']',')'];
  this.previousChar = '';
  this.backrefArray = [];

  var tokens = this.tokenize(regex);
  var tokens = this._checkFirstAndLast(tokens);
  var complexTokens = this.complexTokens(tokens);
  this.resultString = this.complexToString(complexTokens);
}
/*
*@regex:string, a regex ex. "a{2,3}.*"
*@tokens:array, tokens ex. ["(abc)","a","3" ]
*@return: array tokens ex. ["a","{2,3}",".","*"]
*/
ReverseRegex.prototype.tokenize = function(regex,tokens){
  if(regex == '') {return tokens;}
  var specialIndex = this.specialTokens.indexOf(regex[0]);
  if(typeof tokens == 'undefined'){
    tokens = [];
  }
  if(specialIndex <= -1){
    if(regex[0] === '|'){
      var coin = Math.random();
      if(coin > 0.5){
        tokens.length = 0;
        regex = regex.substr(1);
      }
      else
        regex = '';
     }
    else if(regex[0] == '\\'){
      var specialChars = regex[0] + regex[1];
      tokens.push(specialChars);
      regex = regex.substr(2);
    }
    else{ 
      tokens.push(regex[0]);
      regex = regex.substr(1);
    }
  }
  else if(regex[0] === '{' || regex[0] === '['){
    var openingBracket = regex[0];
    var index = this.specialTokens.indexOf(regex[0]);
    var i = 0;
    var closingBracket = this.matchingSpecialToken[index];
    while( regex[i] !=  closingBracket){
      if(regex[i] == '\\') i++;
      this.previousChar = regex[i];
      i++;
    }
    var closingIndex = i;
    var token = regex.slice(0, closingIndex+1);
    regex = regex.slice(closingIndex+1);
    tokens.push(token); 
  }
  else if(regex[0] === '('){
    var closingIndex = this._findParenthesisClosingIndex(regex);
    var token = regex.slice(0, closingIndex+1);
    regex = regex.slice(closingIndex+1);
    tokens.push(token); 
  }
  this.previousChar = regex[0];
  return this.tokenize(regex, tokens);
}
/*
 *@tokens: array, the tokens from the regex as unique elements ex. ['a', '{2,3}', '.', '*']
 *@complex: array, an interpreted version of our tokens, with meta values
 *@return, array, complex
 */
ReverseRegex.prototype.complexTokens = function(tokens, complex){
  if(tokens.length == 0) { return complex; }
  if(complex === undefined) complex = [];
  var token = tokens[0];
  var specialCharacters = regexCharacters.special;
  //checking if token is a special character
  if(token.length == 1 && specialCharacters.indexOf(token) === -1)
    complex.push(token);

  else if(token.length == 1 && specialCharacters.indexOf(token) != -1){
    if(token === '.') complex.push(regexCharacters.all());

    //these special characters are based on repeat,so maybe they should be indiependent
    else{
      var chars = complex.pop();
      //checking if the last element on our complex array is an array
      if(!Array.isArray(chars)){
        chars = [chars];
      }
      //checking if there is already a property called meta
      if(chars.meta === undefined) chars.meta = {};  

      //depeding on the symbol we get a different repetitions number
      if(token === '+')var repetitions = this._calculateRepeats(1);
      if(token === '*')var repetitions = this._calculateRepeats();
      if(token === '?')var repetitions = this._calculateRepeats(0,1);

      chars.meta['repeat'] = repetitions;
      complex.push(chars);
    }
  }  
   //here are multi character tokens
  else if(token.length > 1){
    if(token[0] == '[')var chars = this._compareRegexWithAllCharacters(token);
    if(token[0] == '{'){
      var lastComplexToken = complex.pop();
      var chars = this._repeatPrevious(token, lastComplexToken);
    }
    if(token[0] == '('){ var chars = this._groupParenthesis(token);}
    if(token[0] =='\\')var chars = this._backslash(token);

    complex.push(chars);
  }
  tokens.shift();
  return this.complexTokens(tokens, complex);
}
/*
 *@complexTokens:array, the array with other arrays and meta values
 *@resultString:string, the string composed as we parse the complexTokens
 *@backrefArray:array, an array that holds all backref values for /1,/2 etc.
 *@return: resultString 
 */
ReverseRegex.prototype.complexToString = function(complexTokens, resultString){
  
  if(complexTokens.length == 0) { return resultString; }
  if(resultString === undefined) resultString = ''; 
  
  if(typeof complexTokens[0] == 'string' && complexTokens[0].length == 1){
    resultString += complexTokens[0];
  }
  else if(Array.isArray(complexTokens[0])){
    if(complexTokens[0].meta === undefined){
      resultString += randFromArray(complexTokens[0]);
    }
    else{
      if(complexTokens[0].meta.group === true){
        var i = 0;
        do{
          var complexGroupToken = complexTokens[0].slice(0); //create a reference to another array
          var partialString = this.complexToString(complexGroupToken);
          
          resultString += partialString;
          i++;
          if(complexTokens[0].meta.back === true){
           if(i === complexTokens[0].meta.repeat || complexTokens[0].meta.repeat === undefined )
            this.backrefArray.push(partialString);
          }
        }while(complexTokens[0].meta.repeat !== undefined && i < complexTokens[0].meta.repeat)
      }
      else if(complexTokens[0].meta.repeat !== undefined){
        for(var i=0;i<complexTokens[0].meta.repeat;i++){
          resultString += randFromArray(complexTokens[0]);
        }
      }
    }
  }
  else if(complexTokens[0].backreference !== undefined){
    var i = 0;

    var backrefIndex = complexTokens[0].backreference;
    partialString = this.backrefArray[backrefIndex-1];
    do{
      resultString += partialString;
      i++;
    }while(complexTokens[0].meta !== undefined && complexTokens[0].meta.repeat !== undefined && i < complexTokens[0].meta.repeat)
  }
  complexTokens.shift();
  return this.complexToString(complexTokens, resultString);
}
ReverseRegex.prototype._compareRegexWithAllCharacters= function(token){
  allCharacters = regexCharacters.all();
  var chars = [];
  var expression = new RegExp(token);
  //comparing with all known characters
  while(allCharacters.length > 0){
    if(expression.exec(allCharacters[0]))
      chars.push(allCharacters[0]);

    allCharacters.shift();
  }
  return chars;
}
/*
 *@regex: string, a regex starting with '('
 *@return: int, the index of closing ')'
 */
ReverseRegex.prototype._findParenthesisClosingIndex = function(regex){
  var openingBracket = regex[0];
  var index = this.specialTokens.indexOf(regex[0]);
  var i = 1; //because 0 is the opening
  var closingBracket = this.matchingSpecialToken[index];
  var depth = 0; //depth represents the nubrer of nested parenthsis
  while(regex[i] !=  closingBracket || depth >0){
    if(regex[i] == '\\') i++;
    if(regex[i] == openingBracket) depth++;
    if(regex[i] == closingBracket) depth--;
    this.previousChar = regex[i];
    i++;
  }
  return i;
}
/*
 *pass a group toknen through a tokenizer and complexTokens
 *@token:string, a part of regex in parenthesis ex. "(abc)"
 *@complexTokens:array, with modified tokens 
 */
ReverseRegex.prototype._groupParenthesis= function(token){
  //removing parenthesis
  var regex = token.slice(1,-1);
  var groupTokens = this.tokenize(regex);
  if(groupTokens[0] === '?' && groupTokens[1] === ':'  ){
    groupTokens = groupTokens.slice(2);
    var noBackref = true;
  }
  var complexTokens = this.complexTokens(groupTokens);
  if(complexTokens.meta === undefined) complexTokens.meta = {};
  complexTokens.meta['back'] = true;
  complexTokens.meta['group'] = true;
  if(noBackref === true ){
    complexTokens.meta['back'] = false;
  }
  return complexTokens;
}
/*
*@token:array, the active token,we are in ex. {2,3}
*@complex:array, the complex array created so far
*@return:array, the last element with a meta.repeat value added
*/
ReverseRegex.prototype._repeatPrevious= function(token, lastComplexToken){
  token = token.slice(1,-1);
      
  if(token.indexOf(',') === -1){
    var repetitions = token;
  }
  else{
    var tokenValues = token.split(',');
    if(tokenValues[1] === "")
      var repetitions = this._calculateRepeats(tokenValues[0]);
    else
      var repetitions = this._calculateRepeats(tokenValues[0], tokenValues[1]);
  }
  
  if(!Array.isArray(lastComplexToken)) lastComplexToken = [lastComplexToken];
  if(lastComplexToken.meta === undefined) lastComplexToken.meta = {};
  lastComplexToken.meta['repeat'] = repetitions;
  return lastComplexToken;
}
/*
 *@tokens: array, with all the tokens
 *@return:tokens, the same array with either some additions or without $ and ^
 */
ReverseRegex.prototype._checkFirstAndLast= function(tokens){
  var first = tokens[0];
  var last = tokens.slice(-1)[0];

  if(first !== '^'){
    var coin = Math.random();
    var alphaNum = regexCharacters.alphaNum();
    while(coin < 0.25){
      var randomChar = randFromArray(alphaNum);
      tokens.unshift(randomChar);
      coin = Math.random();
    }
  }else tokens.shift();

  if(last !== '$'){
    var coin = Math.random();
    var alphaNum = regexCharacters.alphaNum();
    while(coin < 0.25){ 
      var randomChar = randFromArray(alphaNum);
      tokens.push(randomChar);
      coin = Math.random();
    }
  }else tokens.pop(); 

  return tokens;
}
/*
 *@token: string, a token thar starts with /
 *@return: either an array, a string or an object
 */
ReverseRegex.prototype._backslash= function(token){
  if(regexCharacters.special.indexOf(token[1]) !== -1){
    return token[1];
  }
  else if(regexCharacters.numbers.indexOf(token[1]) !== -1){  
    return {'backreference' : token[1]} ;
  }
  else
    return this._compareRegexWithAllCharacters(token);
}
/*
*@min: int, the min number of repeats
*@max: int, the max number of repeats
*@return: int, the number of repeats
*/
ReverseRegex.prototype._calculateRepeats= function(min, max){
  if(typeof min === 'undefined') min = 0;
  if(typeof max === 'undefined' || max === "") max = parseInt(min) + Math.floor(Math.random()*5);

  var distance = Math.round(Math.random()* (parseInt(max) - parseInt(min)));
  var repeats = parseInt(min) + distance;

  return repeats;
}


//some usefull functions that didn't fit to prototype
function randFromArray(myArray){
  return myArray[Math.floor(Math.random() * myArray.length)];
}

var regexCharacters = {
  special: '^$*+?.()|/'.split(''),
  lowCase: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  capCase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  numbers: '0123456789'.split(''),
  space:   ' ',
  otherChars:  '~\'"-:_`'.split(''),
  all: function(){
    return this.special.concat(this.lowCase, this.capCase, this.numbers, this.otherChars, this.space);
  },
  nonSpecial: function(){
    return this.lowCase.concat(this.capCase, this.numbers, this.otherChars);
  },
  alphaNum: function(){
    return  this.lowCase.concat(this.capCase,this.numbers);;
  },
  alpha: function(){
    return this.lowCase.concat(this.capCase);
  }
}