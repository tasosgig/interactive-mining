/*

A list of terms, where the size and color of each term is determined
by a number (typically numebr of times it appears in some text).
Uses the Google Visalization API.

Data Format
  First column is the text (string)
  Second column is the weight (positive number)
  Third optional column ia a link (string)

Configuration options:
  target Target for link: '_top' (defailt) '_blank'

Methods
  none

Events
  select

*/
function changecss(theClass,element,value) {
	//Last Updated on June 23, 2009
	//documentation for this script at
	//http://www.shawnolson.net/a/503/altering-css-class-attributes-with-javascript.html
	 var cssRules;
         alert("class is:"+theClass+" element:"+element+"value: "+value);
	 var added = false;
	 for (var S = 0; S < document.styleSheets.length; S++){

    if (document.styleSheets[S]['rules']) {
	  cssRules = 'rules';
	 } else if (document.styleSheets[S]['cssRules']) {
	  cssRules = 'cssRules';
	 } else {
	  //no rules found... browser unknown
	 }

	  for (var R = 0; R < document.styleSheets[S][cssRules].length; R++) {
	   if (document.styleSheets[S][cssRules][R].selectorText == theClass) {
               alert("found");
	    if(document.styleSheets[S][cssRules][R].style[element]){
	    document.styleSheets[S][cssRules][R].style[element] = value;
	    added=true;
		break;
	    }
	   }
	  }
	  if(!added){ alert("not added");
	  if(document.styleSheets[S].insertRule){
			  document.styleSheets[S].insertRule(theClass+' { '+element+': '+value+'; }',document.styleSheets[S][cssRules].length);
			} else if (document.styleSheets[S].addRule) {
				document.styleSheets[S].addRule(theClass,element+': '+value+';');
			}
	  }
	 }
	}


TermCloud = function(container) {
  this.container = container;
}

TermCloud.MIN_UNIT_SIZE = 1;
TermCloud.MAX_UNIT_SIZE = 7;
TermCloud.RANGE_UNIT_SIZE = TermCloud.MAX_UNIT_SIZE - TermCloud.MIN_UNIT_SIZE;

TermCloud.prototype.draw = function(data, options) {
//    var initcolor=168;
//    for ( var i=1; i<10;i++){
//        changecss('.term-cloud-'+i,'color','rgb('+initcolor+','+initcolor+','+initcolor+')');
//        alert("ok");
//        initcolor+=16;
//    }
  var cols = data.getNumberOfColumns();
  var valid = (cols >= 2 && cols <= 3 && data.getColumnType(0) == 'string' &&
      data.getColumnType(1) == 'number');
  if (valid && cols == 3) {
    valid = data.getColumnType(2) == 'string';
  }

  if (!valid) {
    this.container.innerHTML = '<span class="term-cloud-error">TermCloud Error: Invalid data format. First column must be a string, second a number, and optional third column a string</span>';
    return;
  }

  options = options || {};
  morethanone=false;
  var linkTarget = options.target || '_top';

  // Compute frequency range
  var minFreq = 999999;
  var maxFreq = 0;
  for (var rowInd = 0; rowInd < data.getNumberOfRows(); rowInd++) {
    var f = data.getValue(rowInd, 1);
    if (f > 0) {
      minFreq = Math.min(minFreq, f);
      maxFreq = Math.max(maxFreq, f);
    }
    var teststr = data.getValue(rowInd, 0);
    if (teststr.indexOf(' ')>=0){
        morethanone=true;

    }
  }
  var label=data.getColumnLabel(1);

  if (minFreq > maxFreq) {
    minFreq = maxFreq;
  }
  if (minFreq == maxFreq) {
      minFreq--;
    //maxFreq++;
  }
  var range = maxFreq - minFreq;
  range = Math.max(range, 4);

  var html = [];
  html.push('<div class="term-cloud">');
  for (var rowInd = 0; rowInd < data.getNumberOfRows(); rowInd++) {
    var f = data.getValue(rowInd, 1);
    if (f > 0) {
      var text = data.getValue(rowInd, 0);
      var link = cols == 3 ? data.getValue(rowInd, 2) : null;
      var freq = data.getValue(rowInd, 1);
      var size = TermCloud.MIN_UNIT_SIZE +
           Math.round((freq - minFreq) / range * TermCloud.RANGE_UNIT_SIZE);
      
        html.push('<a class="term-cloud-link" href="#" >');
      
      html.push('<span class="term-cloud-', size, '">');
      html.push(this.escapeHtml(text));
      html.push('</span>');
/*ML code */
      html.push('<span class="extra">');
      if (link!=null){
        html.push(label+": "+freq+"<br/>"+this.escapeHtml(link));
      }
      else{
          html.push(label+": "+freq);
      }
      html.push('</span>');


/**/
        
        html.push('</a>');
        if (morethanone==true){
            html.push('<br/>');
        
        }
      
      html.push(' ');
    }
  }
  html.push('</div>');

  this.container.innerHTML = html.join('');
};

TermCloud.prototype.escapeHtml = function(text) {
  if (text == null) {
    return '';
  }
  return text.replace(/&/g, '&amp;').
      replace(/</g, '&lt;').
      replace(/>/g, '&gt;').
      replace(/"/g, '&quot;');
};
