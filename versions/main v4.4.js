//	FIXME
//	=====
//	* overlap/collision, (also when a shape abruptly changes orientation)
//
//	TODO
//	====
//	* Quadtrees!!
//	* panel and right click menus
//	* behaviours:
//		- all chase the same + chase in a line + rect movements,
//		-avoid objects and obstacles ,follow path...
//	* include external SVGs - 'use or image' (no Mozilla support yet!!), coordinating from an upperlevel XHTML document or using AJAX
//	* XML configuration file
//	* resize event
//

addEventListener( 'load', init, false );

function init()
{
  svgMain = document.getElementById( 'svgMain' );

  ///INITIALIZE FULL SCREEN
  document.documentElement.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );
  document.documentElement.setAttribute( 'width' , window.innerWidth );
  document.documentElement.setAttribute( 'height', window.innerHeight );

  ///ORGANIZE ELEMENTS IN LISTS
  allList = getList();
  elementList = allList.find( element );
  objectList = elementList.find( element, 'object' );
  characterList = elementList.find( element , 'character' );
  animatedElementList = characterList;
  selectedList = [];
  scene = allList.find( map, 'main')[0];

  /*var */collisionList = elementList.slice();
  collisionList = collisionList.concat( scene.sceneItems );
//   collisionTree = new quadTreeNode( collisionList, scene.mapSizeX, scene.mapSizeY  );
//   collisionTree.split();
// collisionLists = collisionTree.getLeafLists();

//   subject = characterList.search( 'subject' );

  ///error check
  if ( !scene ) return;

  selectBox = new selectionBox();
  svgMain.setAttribute( 'overflow' , 'visible' );
  svgMain.setAttribute( 'shape-rendering' , 'optimizeSpeed' );
  svgMain.setAttribute( 'image-rendering' , 'optimizeSpeed' );
//   svgMain.setAttribute( 'text-rendering' , 'optimizeSpeed' );

  //SET GLOBAL EVENTS
  document.addEventListener( 'keydown', 	keyDown, false );
  document.addEventListener( 'mouseup', 	mouseUp, false );
  document.addEventListener( 'contextmenu', 	function(e){ e.stopPropagation();e.preventDefault(); return false}, false );

  setInterval( 'drawFrame()', 50 );
}

  //GENERAL CONFIGURATION

  photogramsPerCycle = 10;
  panSteps = 50;
  shiftAngle = 5*Math.PI/180;
  frictionMoment = 0.005;
  baseSpeed = 5;
  baseAccel = 0.5;

function getNodeList( attribute, value, tagName )	///get SVG nodes with that 'attribute' that match 'value', or all if no 'value'. All SVGs if no 'attribute'.
{
    var SVGlist = document.getElementsByTagName( tagName || 'svg' );
    var nodeList = [];

    if ( attribute )
      for ( var i = 0 ; i < SVGlist.length ; i++ )
      {
	var auxAttr = SVGlist[i].getAttribute( attribute )  ;
	if ( auxAttr && ( !value || auxAttr == value ) )
	  nodeList.push( SVGlist[i] );
      }
    else
      nodeList = SVGlist;

    return nodeList;
}

function getList( attribute, value, tagName )  ///Returns list of objects, each one of its correct object type. List contains 'attribute=value', 'attribute'=(any)', or all SVGs.
{
  var list = [];
  var nodeList = getNodeList( attribute, value, tagName ); 	//gets all SVGs if no attribute, all of kind 'attribute' if no 'value'

  for ( var i = 0 ; i < nodeList.length ; i++ )
    if ( nodeList[i].getAttribute( 'element' ) )
    {
      if ( nodeList[i].getAttribute( 'element' ) == 'object' )
	list.push( new element( nodeList[i].getAttribute( 'id' ) ) );
      else if ( nodeList[i].getAttribute( 'element' ) == 'character' )
	list.push( new character( nodeList[i].getAttribute( 'id' ) ) );
    }
    else if ( nodeList[i].getAttribute( 'map' ) )
      list.push( new map( nodeList[i].getAttribute( 'id' ) ) );
    else if ( nodeList[i].getAttribute( 'panel' ) )
      list.push( new panel( nodeList[i].getAttribute( 'id' ) ) );

  return list;
}

function pathIsValidPolygon( SVGNodePath )	//we assume the polygon is described by a SVG closed <PATH> without arcs or bezier curves
{
    var result = true;
    if ( SVGNodePath.nodeName == 'path' )
    {
      var txtPoints = SVGNodePath.getAttribute( 'd' ).split( ' ' );
      for ( var i = 0 ; i < txtPoints.length ; i++ )
	if ( txtPoints[i] == 's' || txtPoints[i] == 'S' || txtPoints[i] == 'c' || txtPoints[i] == 'C' || txtPoints[i] == 'Q'
	  ||  txtPoints[i] == 'q' || txtPoints[i] == 'T' || txtPoints[i] == 't' ||  txtPoints[i] == 'A' || txtPoints[i] == 'a' ||
	  txtPoints[i] == 'H' ||txtPoints[i] == 'h' || txtPoints[i] == 'V' || txtPoints[i] == 'v' )
	  result = false;
    }
    return result;
}

function pointsFromPath( SVGNodePath )
{
    var points = [];
    if ( SVGNodePath.nodeName == 'path' )
    {
      var txtPoints = SVGNodePath.getAttribute( 'd' ).split( ' ' );
      var firstPt = txtPoints[1].split( ',' );			//the first point is the absolute position, all the others are relative to this one
      points[0] = new vector( parseFloat( firstPt[0] ) , parseFloat( firstPt[1] ) );

      //INCREMENTAL OR ABSOLUTE MODE
      if ( txtPoints[0] == 'm' )	//incremental mode
	var a = 1;
      else // 'M' absolute mode
	var a = 0;

      for ( var i = 2 ; i < txtPoints.length - 2 ; i++ )		//get rid of the 'm' and the 'z', don't count the first, or the last one that closes (= to the first)
      {
	if ( txtPoints[i] == 'l' ) //incremental mode
	  a = 1;
	else if ( txtPoints[i] == 'L' ) //absolute mode
	  a = 0;
	else if ( txtPoints[i] == 'c' || txtPoints[i] == 's' )
	{
	  alert( "Warning:curve found in polygon, stopping further reading" );
	  return points;
	}
	else
	{
	  var aux = txtPoints[i].split( ',' );
	  points.push ( new vector( parseFloat( aux[0] ) + a*points[points.length-1].x , parseFloat( aux[1] ) + a*points[points.length-1].y ) );
	}
      }
    }
    return points;
}

Array.prototype.find = function ( class, type )
{
    var returnList = [];

    var j=0;
    for ( var i = 0 ; i < this.length ; i++ )
      if ( ( !class || this[i].constructor == class  ) && ( !type || this[i].type == type ) )
	returnList.push( this[i] );
    return returnList;
}

//////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

function drawFrame()
{
  doMovements();
  doCollisions();
  doAnimations();
  doDrawing();
  scene.pan();
  scene.zoom();
}

function doMovements( objList )		// Move the objects in the list ('objList' is an array of strings with the identifiers). Move all if no list
{
    objList = objList || elementList;
    for ( var i = 0 ; i < objList.length ; i++ )
      objList[i].move();
}

function doDrawing( objList )
{
    objList = objList || elementList;
    for ( var i = 0 ; i < objList.length ; i++ )
    {
      if ( objList[i].movementList[0] )
	objList[i].drawPosition();
      if ( objList[i].rotation )
	objList[i].drawRotation();
    }
}

function doAnimations( objList )		// Animate the objects in the list ('objList' is an array of strings with the identifiers). Animate all if no list
{
    objList = objList || animatedElementList;
    for ( var i = 0 ; i < objList.length ; i++ )
      objList[i].animate();
}

// function doCollisions( objList )//TODO more intelligent checks (don't check collisions of items that are not moving between themselves)
// {
//   objList = objList || collisionList;
//   var  colPt = [];
//   var  inObj = [];
//   var outObj = [];
//   var inPart = [];
//
//   for ( var i = 0 ; i < objList.length ; i++ )
//     colPt[i] = [];
//
//   //DETECT OVERLAP, AND CORRECT IT
//   for ( var i = 0 ; i < objList.length ; i++ )
//     for ( var j = i+1 ; j < objList.length ; j++ )
//       if ( overlapPoints( objList[i], objList[j] ) )	//preliminary check for fast computing: see if the outer bounding boxes overlap prior to exact detection
// 	for ( var k = 0 ; k < objList[i].parts.length ; k++ )
// 	  for ( var l = 0 ; l < objList[j].parts.length ; l++ )
// 	  {
// 	      var colPts = overlapPoints( objList[i].parts[k] , objList[j].parts[l] );
// 	    if ( colPts )
// 	    {
// 	      var rewindData = rewindOnCollision( objList[i].parts[k], objList[j].parts[l], colPts[0], colPts[1] );
// 	      colPt[i][j] = rewindData.colPt;
//
// 	      //Choose the inner object to decide the normal (only important for polygon corners)
// 	      if( colPts[0].length >= colPts[1].length )
// 	      {
// 		inObj[i] = objList[i];
// 		outObj[i] = objList[j];
// 		inPart[i] = objList[i].parts[k];
// 	      }
// 	      else
// 	      {
// 		inObj[i] = objList[j];
// 		outObj[i] = objList[i];
// 		inPart[i] = objList[j].parts[l];
// 	      }
//
// 	      //Erase track of other collisions detected, as we are going to rewind and they won't have happened yet
// 	      for ( var n = 0 ; n < i ; n++ )
// 		colPt[n] = [];
//
// 	      //Rewind all objects' movements to the point of this collision
// 	      for ( var n = 0 ; n < objList.length ; n++ )
// 		if ( n != i && n != j && objList[n] instanceof element )
// 		{
// 		  objList[n].pos =  objList[n].pos.minus( objList[n].velocity().multiply( rewindData.rewindFraction ) );
// 		  objList[n].rotate ( -objList[n].angVelocity() * rewindData.rewindFraction );
// 		}
// 	    }
// 	  }
//
//   //SOLVE THE COLLISION	//TODO depending on the nature of the objects
//   for ( var i = 0 ; i < colPt.length ; i++ )
//     for ( var j = i+1 ; j < colPt.length ; j++ )
//       if ( colPt[i][j] )
// 	    elasticImpact( inObj[i], outObj[i], inPart[i].getShape().getNormal( colPt[i][j] ), colPt[i][j] );
// }

function doCollisions( objList )//TODO more intelligent checks
{
  objList = objList || collisionList;
  var  colPt = [];
  var  inObj = [];
  var outObj = [];
  var inPart = [];

  for ( var i = 0 ; i < objList.length ; i++ )
    colPt[i] = [];

  //DETECT OVERLAP, AND CORRECT IT
  for ( var i = 0 ; i < objList.length ; i++ )
    for ( var j = i+1 ; j < objList.length ; j++ )
      if ( ( ( objList[i].movementList && objList[i].movementList[0] ) || objList[i].rotation	//check that at least one is moving or rotating
	  || ( objList[j].movementList && objList[j].movementList[0] ) || objList[j].rotation )
	  && overlapPoints( objList[i], objList[j] ) )//preliminary check for fast computing: see if the outer bounding boxes overlap prior to exact detection
	for ( var k = 0 ; k < objList[i].parts.length ; k++ )
	  for ( var l = 0 ; l < objList[j].parts.length ; l++ )
	  {
	      var colPts = overlapPoints( objList[i].parts[k] , objList[j].parts[l] );
	    if ( colPts )
	    {
	      var rewindData = rewindOnCollision( objList[i].parts[k], objList[j].parts[l], colPts[0], colPts[1] );
	      colPt[i][j] = rewindData.colPt;

	      //Choose the inner object to decide the normal (only important for polygon sharp corners)
	      if( colPts[0].length >= colPts[1].length )
	      {
		inObj[i] = objList[i];
		outObj[i] = objList[j];
		inPart[i] = objList[i].parts[k];
	      }
	      else
	      {
		inObj[i] = objList[j];
		outObj[i] = objList[i];
		inPart[i] = objList[j].parts[l];
	      }

	      //Erase track of other collisions detected. We are going to rewind, so they won't have happened yet
	      for ( var n = 0 ; n < i ; n++ )
		colPt[n] = [];

	      //Rewind all objects' movements to the point of this collision
	      for ( var n = 0 ; n < objList.length ; n++ )
		if ( n != i && n != j && objList[n] instanceof element )
		{
		  objList[n].pos =  objList[n].pos.minus( objList[n].velocity().multiply( rewindData.rewindFraction ) );
		  objList[n].rotate ( -objList[n].angVelocity() * rewindData.rewindFraction );
		}
	    }
	  }

  //SOLVE THE COLLISION	//TODO depending on the nature of the objects
  for ( var i = 0 ; i < colPt.length ; i++ )
    for ( var j = i+1 ; j < colPt.length ; j++ )
      if ( colPt[i][j] )
	    elasticImpact( inObj[i], outObj[i], inPart[i].getShape().getNormal( colPt[i][j] ), colPt[i][j] );
}

function quadTreeNode ( objList, mapWidth, mapHeight, x, y, depth, maxDepth, maxOcupation )
{
  this.elements = objList.slice();
  this.childNodes = [];

  this.maxDepth = maxDepth || 3;				//4^3 = 64 subdivisions
  this.maxOcupation = maxOcupation || 1;

  this.depth = depth || 0;
  this.x = x || 0;
  this.y = y || 0;
  this.mapWidth = mapWidth;
  this.mapHeight = mapHeight;
}

quadTreeNode.prototype.split = function( maxOcupation, maxDepth )
{
  this.maxOcupation = maxOcupation || this.maxOcupation;
  this.maxDepth = maxDepth || this.maxDepth;
  if ( this.elements.length > this.maxOcupation && this.depth < this.maxDepth )		//conditions to stop division
  {
    var qTable = [];
    qTable[0] = [];		//first quadrant: TOP LEFT
    qTable[1] = [];		//second quadrant: TOP RIGHT
    qTable[2] = [];		//third quadrant: BOTTOM LEFT
    qTable[3] = [];		//fourth quadrant: BOTTOM RIGHT

    //make a list for each quadrant
    for ( var i = 0 ; i < this.elements.length ; i++ )
    {
      if ( ( this.elements[i].pos.x + this.elements[i].BBox.width/2 < this.x + this.mapWidth/2
	  || this.elements[i].pos.x - this.elements[i].BBox.width/2 < this.x + this.mapWidth/2 )
	&& ( this.elements[i].pos.y + this.elements[i].BBox.height/2 < this.y + this.mapHeight/2
	  || this.elements[i].pos.y - this.elements[i].BBox.height/2 < this.y + this.mapHeight/2 ) )
	qTable[0].push( this.elements[i] );

      if ( ( this.elements[i].pos.x + this.elements[i].BBox.width/2 >= this.x + this.mapWidth/2
	  || this.elements[i].pos.x - this.elements[i].BBox.width/2 >= this.x + this.mapWidth/2 )
	&& ( this.elements[i].pos.y + this.elements[i].BBox.height/2 < this.y + this.mapHeight/2
	  || this.elements[i].pos.y - this.elements[i].BBox.height/2 < this.y + this.mapHeight/2 ) )
	qTable[1].push( this.elements[i] );

      if ( ( this.elements[i].pos.x + this.elements[i].BBox.width/2 < this.x + this.mapWidth/2
	  || this.elements[i].pos.x - this.elements[i].BBox.width/2 < this.x + this.mapWidth/2 )
	&& ( this.elements[i].pos.y + this.elements[i].BBox.height/2 >= this.y + this.mapHeight/2
	  || this.elements[i].pos.y - this.elements[i].BBox.height/2 >= this.y + this.mapHeight/2 ) )
	qTable[2].push( this.elements[i] );

      if ( ( this.elements[i].pos.x + this.elements[i].BBox.width/2 >= this.x + this.mapWidth/2
	  || this.elements[i].pos.x - this.elements[i].BBox.width/2 >= this.x + this.mapWidth/2 )
	&& ( this.elements[i].pos.y + this.elements[i].BBox.height/2 >= this.y + this.mapHeight/2
	  || this.elements[i].pos.y - this.elements[i].BBox.height/2 >= this.y + this.mapHeight/2 ) )
	qTable[3].push( this.elements[i] );
    }
    //make the new 'leaf' nodes
    this.childNodes[0] = new quadTreeNode( qTable[0], this.mapWidth/2, this.mapHeight/2, this.x, this.y, this.depth + 1, this.maxDepth, this.maxOcupation );
    this.childNodes[1] = new quadTreeNode( qTable[1], this.mapWidth/2, this.mapHeight/2, this.x + this.mapWidth/2, this.y, this.depth + 1, this.maxDepth, this.maxOcupation );
    this.childNodes[2] = new quadTreeNode( qTable[2], this.mapWidth/2, this.mapHeight/2, this.x, this.y + this.mapHeight/2, this.depth + 1, this.maxDepth, this.maxOcupation );
    this.childNodes[3] = new quadTreeNode( qTable[3], this.mapWidth/2, this.mapHeight/2, this.x + this.mapWidth/2, this.y + this.mapHeight/2, this.depth + 1, this.maxDepth, this.maxOcupation );

    //split each one of them
    this.childNodes[0].split( maxOcupation, maxDepth );
    this.childNodes[1].split( maxOcupation, maxDepth );
    this.childNodes[2].split( maxOcupation, maxDepth );
    this.childNodes[3].split( maxOcupation, maxDepth );
  }
}

quadTreeNode.prototype.insertElement = function( element )		//insert the element in a node and all its subtree, if appropriate
{
    if ( ( ( element.pos.x + element.BBox.width/2 <= this.x + this.mapWidth && element.pos.x + element.BBox.width/2 >= this.x )
      || ( element.pos.x - element.BBox.width/2 <= this.x + this.mapWidth  && element.pos.x - element.BBox.width/2 >= this.x ) )
    && ( ( element.pos.y + element.BBox.height/2 <= this.y + this.mapHeight && element.pos.y + element.BBox.height/2 >= this.y )
      || ( element.pos.y - element.BBox.height/2 <= this.y + this.mapHeight && element.pos.y - element.BBox.height/2 >= this.y ) ) )
    {
      this.elements.push( element );
      if ( this.childNodes.length > 0 )		//non terminal node
	for ( var i = 0 ; i < 4 ; i++ )
	  this.childNodes[i].insertElement( element );
    }//TODO check if update is necessary (maxocupation, maxdepth)
}

quadTreeNode.prototype.removeElement = function( element )	//remove the element from a node and all its subtree
{
    for ( var j = 0 ; j < this.elements.length ; j++ )
      if ( element === this.elements[j] )
      {
	this.elements.splice( j, 1 );			//remove it
	if ( this.childNodes.length > 0 )		//non terminal node
	  for ( var i = 0 ; i < 4 ; i++ )
	    this.childNodes[i].removeElement( element );
	j = this.elements.length;			//finish (assume no duplicated elements)
      }
}

quadTreeNode.prototype.update = function( maxOcupation, maxDepth )	//rebuild the subtree under this node
{
  this.childNodes = [];
  this.split( maxOcupation, maxDepth );
}

quadTreeNode.prototype.getLeafLists = function()	//returns an array of lists, consisting on the (non-empty) element lists for every terminal leaf node
{
  var retArray = [];
  if ( this.childNodes.length > 0 )		//non terminal node
  {
    for ( var i = 0 ; i < 4 ; i++ )
    {
      var list = this.childNodes[i].getLeafLists();
      if ( list.length > 0 )
      {
	if (!( list[0] instanceof Array ) )	//list of elements, so stack
	  retArray.push( list );
	else
	  retArray = retArray.concat( list );	//list of lists, so concatenate
      }
    }
  }
  else if ( this.elements.length > 1 )
    retArray = this.elements.slice();		//terminal 'leaf' node, return the elements in this tile
  return retArray;
}

/////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function panel( id )//TODO
{
      if ( !id ) return;
      this.SVGNode = document.getElementById( id );
      this.id = id;
      this.type = this.SVGNode.getAttribute( 'panel' );
//       this.SVGNode.setAttribute( 'x', 0 );
  this.SVGNode.setAttribute( 'overflow' , 'visible' );
}


/////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
function overlapPoints ( obj1, obj2 )	//return the collection of intersecting points for each object, or 'undefined'
{
    var result = undefined;

    if ( obj1 && obj2 && obj1 !== obj2 )
    {
      if ( obj1 instanceof rectangle )//TODO
	var obj1Shape = obj1;
      else
	var obj1Shape = obj1.getShape();
      if ( obj2 instanceof rectangle )
	var obj2Shape = obj2;
      else
	var obj2Shape = obj2.getShape();

      var colPts1 = obj1Shape.ptsInside( obj2Shape );
      var colPts2 = obj2Shape.ptsInside( obj1Shape );

      if ( colPts1.length > 0 || colPts2.length > 0 )
	result = [ colPts1 , colPts2 ];
    }
    return result;
}

function rewindOnCollision ( obj1, obj2, obj1Pts, obj2Pts )	//moves the two objects to correct overlapping
{
    var result = undefined;
    if ( obj1 !== obj2 )
    {
      if ( ( !obj2Pts && !obj1Pts ) || ( obj2Pts.length == 0 && obj1Pts.length == 0 ) )
      {
	var points = obj1.overlapPoints( obj2 );
	if ( points )
	{
	  obj1Pts = points[0];
	  obj2Pts = points[1];
	}
      }
	//LOOK FOR THE DEEPEST POINT
	var deepestDist = 0;
	for ( var i = 0 ; i < obj1Pts.length ; i++ )
	{
	  var velP1 = obj1.pointVelocity( obj1Pts[i] );
	  var velP2 =  obj2.pointVelocity( obj1Pts[i] );

	  //Total collision velocity
	  var totalVel = obj2.velocity().add( velP2 ).minus( obj1.velocity() ).minus( velP1 );//velocity relative to 'obj1'

	  var overlap = obj1.getShape().overlapDistance( obj1Pts[i], totalVel );
	  var dist = overlap.modulus();
	  if (  dist > deepestDist )
	  {
	    deepestDist = dist;

	    var inObj = obj1;
	    var outObj = obj2;
	    var colPt = obj1Pts[i];
	    var maxOverlap = overlap;			//relative to 'inObj' (outwards from 'inObj')
	    var colVel = totalVel;			//relative to 'inObj'
	  }
	}
	for ( var i = 0 ; i < obj2Pts.length ; i++ )
	{
	  var velP1 = obj1.pointVelocity( obj2Pts[i] );
	  var velP2 = obj2.pointVelocity( obj2Pts[i] );

	  //Total collision velocity
	  var totalVel = obj2.velocity().add( velP2 ).minus( obj1.velocity() ).minus( velP1 );	//velocity relative to 'obj1'

	  var overlap = obj2.getShape().overlapDistance( obj2Pts[i], totalVel.multiply(-1) );
	  var dist = overlap.modulus();
	  if (  dist > deepestDist )
	  {
	    deepestDist = dist;

	    var inObj = obj2;
	    var outObj = obj1;
	    var colPt = obj2Pts[i];
	    var maxOverlap = overlap;			//relative to 'inObj' (outwards from 'inObj')
	    var colVel = totalVel;
	  }
	}

	//PARAMETERS TO CORRECT OVERLAP
	var colSpd = colVel.modulus();
	var dist   = maxOverlap.modulus();

	if ( colSpd != 0 )
	{
	  var rewindFraction = dist/colSpd;	//represents how much we 'rewind' the movement, to the original place of collision with no overlap.

	  rewindFraction = parseFloat( ( rewindFraction + 0.00001 ).toFixed( 5 ) );	//round error correction to assure no further overlapping

	  var correct1 = inObj.velocity().multiply( rewindFraction );
	  var correct2 = outObj.velocity().multiply( rewindFraction );
	}
	else
	{
	  var rewindFraction = 0;
	  var correct1 = maxOverlap.multiply( 1/2 );
	  var correct2 = maxOverlap.multiply( -1/2 );
	}

	//CORRECT OVERLAP, REVERSING PART OF THE LAST MOVEMENT AND ROTATION
	if ( inObj.parentElement instanceof element )
	{
	  inObj.parentElement.pos  =  inObj.parentElement.pos.minus( correct1 );
	  inObj.parentElement.rotate ( -inObj.parentElement.angVelocity() * rewindFraction );
	}
	if ( outObj.parentElement instanceof element )
	{
	  outObj.parentElement.pos = outObj.parentElement.pos.minus( correct2 );
	  outObj.parentElement.rotate( -outObj.parentElement.angVelocity() * rewindFraction );
	}

	var colPt = colPt.minus( correct2.add( outObj.pointVelocity( colPt, -outObj.angVelocity() * rewindFraction ) ) );

	result = { 'colPt':colPt , 'rewindFraction':rewindFraction };
    }
    return result;		//return the collision point and the rewind fraction, or 'undefined'
}

function elasticImpact ( obj1, obj2, dirN, point )	//solve impact according to surfaces, or with a wall with normal 'normalDir'
{
    // EXTRACT PARAMETERS
    if ( obj1.velocity )
      var vel1 = obj1.velocity();
    else
      var vel1 = new vector( 0 , 0 );
    if ( obj2.velocity )
      var vel2 = obj2.velocity();
    else
      var vel2 = new vector( 0 , 0 );

    if ( obj1.angVelocity )
      var w1 = obj1.angVelocity();
    else
      var w1 = 0;
    if ( obj2.angVelocity )
      var w2 = obj2.angVelocity();
    else
      var w2 = 0;

    var m1   = obj1.mass || Infinity;
    var m2   = obj2.mass || Infinity;
    var moi1 = obj1.momInertia || Infinity;
    var moi2 = obj2.momInertia || Infinity;

    var dirN = dirN || obj1.pos.minus( obj2.pos );

    ///CHANGE AXES: extract the velocity in the axis parallel and normal to the collision
    var newAxes = new axes( dirN );
    var projVel1 = newAxes.project( vel1 );
    var projVel2 = newAxes.project( vel2 );

    //CALCULATE THE MOMENT ARM
    var d1 = point.minus( obj1.pos );
    var d2 = point.minus(  obj2.pos );
    var ang1 = d1.angle( dirN.multiply(-1) );//the impulse is defined inwards to 'obj1' obj2ect
    var ang2 = d2.angle( dirN.multiply(-1) );
    var a1 = d1.modulus()*Math.sin( ang1 );
    var a2 = d2.modulus()*Math.sin( ang2 );

    //A) CALCULATE THE IMPULSE: to get exchange of angular and linear velocities between obj2ects. Defined inwards to 'obj1' obj2ect
    //formula based in B) and in conservation of energy
    var j = -2*( projVel1.x - projVel2.x - w1*a1 + w2*a2 )/( 1/m1 + 1/m2 + a1*a1/moi1 + a2*a2/moi2 );

    //B) CALCULATE NEW VELOCITIES AND SPINS FROM IMPULSE
    var v1f = projVel1.x + j/m1;
    var v2f = projVel2.x - j/m2;
    var w1f = w1 - j*a1/moi1;
    var w2f = w2 + j*a2/moi2;

    //DETERMINE NEW VELOCITIES AND ROTATIONS IN THE ORIGINAL AXES
    if ( j != 0 )
    {
      var auxVel1 = new vector( v1f , projVel1.y );
      var auxVel2 = new vector( v2f , projVel2.y );

      var newVel1 = newAxes.unproject( auxVel1 );
      var newVel2 = newAxes.unproject( auxVel2 );

      if ( obj1 instanceof element )
      {
	obj1.replaceMovement ( new movement( newVel1.direction(), newVel1.modulus(), baseAccel/2, false ) );
	obj1.rotation = new rotation( w1f , frictionMoment );
      }

      if ( obj2 instanceof element )
      {
	obj2.replaceMovement ( new movement( newVel2.direction(), newVel2.modulus(), baseAccel/2, false ) );
	obj2.rotation = new rotation( w2f , frictionMoment );
      }
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////

function vector( x, y )
{
    if ( x instanceof vector )
    {
      this.x = x.x;
      this.y = x.y;
    }
    else
    {
      if (x)
	this.x = parseFloat( x );
      else
	this.x = 0.0;
      if(y)
	this.y = parseFloat( y );
      else
	this.y = 0.0;
    }
}

vector.prototype.add = function ( deltaX, deltaY )
{
    var returnPoint = new vector( this.x, this.y );

    if ( deltaX instanceof vector )
    {
	returnPoint.x += deltaX.x;
	returnPoint.y += deltaX.y;
    }
    else
    {
	returnPoint.x += deltaX;
	returnPoint.y += deltaY;
    }

    return returnPoint;
}

vector.prototype.minus = function ( deltaX, deltaY )
{
    var returnPoint = new vector( this.x, this.y );

    if ( deltaX instanceof vector )
    {
	returnPoint.x -= deltaX.x;
	returnPoint.y -= deltaX.y;
    }
    else
    {
	returnPoint.x -= deltaX;
	returnPoint.y -= deltaY;
    }

    return returnPoint;
}

vector.prototype.multiply = function ( scalar )
{
    var returnPoint = new vector( this.x, this.y );
    if ( scalar == undefined )
      scalar = 1;
    returnPoint.x *= scalar;
    returnPoint.y *= scalar;
    return returnPoint;
}

vector.prototype.modulus = function ()
{
    return Math.sqrt( this.x*this.x + this.y*this.y );
}

vector.prototype.direction = function ()
{
    return this.multiply( 1/this.modulus() );
}

vector.prototype.angle = function( vec )		//returns the angle with X axis, or with vector, defined between [-PI, +PI)
{
    if ( vec instanceof vector )
      var value = angleCheck( vec.angle() - this.angle() );
    else
    {
      if ( this.x < 0 )
	var shift = Math.PI;
      else
	var shift = 0;
      var value = ( shift + Math.atan( this.y/this.x ) );		//values between [-PI/2, 3*PI/2)

      if ( value >= Math.PI )					//correct the range [PI, 3*PI/2)
	value -= 2*Math.PI;
    }
    return value;
}

vector.prototype.angle2 = function( vec )		//returns the angle with X axis, or with vector, defined between [0, +2PI)
{
    if ( vec instanceof vector )
      var value = angleCheck2( vec.angle() - this.angle() );
    else
    {
      if ( this.x < 0 )
	var shift = Math.PI;
      else
	var shift = 0;
      var value = ( shift + Math.atan( this.y/this.x ) );		//values between [-PI/2, 3*PI/2)

      if ( value < 0 )					//correct the range [-PI/2, 0)
	value += 2*Math.PI;
    }
    return value;
}

function angleCheck( ang )					//makes sure an angle is expressed between [-PI, +PI)
{
  ang = ang % (2*Math.PI);					//values between [-2*PI/2, +2*PI)
  if ( ang < -Math.PI )					//correct the range [-PI, -2*PI)
    ang += 2*Math.PI;
  if ( ang > Math.PI )						//correct the range [+PI, +2*PI)
    ang -= 2*Math.PI;
  return ang;
}

function angleCheck2( ang )					//makes sure an angle is expressed between [0,2PI)
{
  ang = ang % (2*Math.PI);					//values between [-2*PI/2, +2*PI)
  if ( ang < 0 )					//correct the range [-2PI, 0)
    ang += 2*Math.PI;
  return ang;
}

vector.prototype.project = function( vecX, vecY )
{
    if ( vecX instanceof vector )
      return this.x*vecX.x + this.y*vecX.y;
    else
      return this.x*vecX + this.y*vecY;
}

vector.prototype.rotate = function ( angle )
{
    if ( angle == undefined )
      angle = shiftAngle;
    if ( angle != 0 )
    {
      var sinA = Math.sin( angle );
      var cosA = Math.cos( angle );
      var x = this.x*cosA - this.y*sinA ;
      var y = this.x*sinA + this.y*cosA ;
      this.x = x;
      this.y = y;
    }
}

vector.prototype.equals = function ( a, b )
{
    if ( a instanceof vector )
    {
      if ( this.x == a.x && this.y == a.y )
	return true;
      else
	return false;
    }
    else
    {
      if ( this.x == a && this.y == b )
	return true;
      else
	return false;
    }
}

function avgVector( vectorList )
{
    var result = new vector( vectorList[0] );
    if ( vectorList.length > 1 )
    {
      for ( var i = 1 ; i < vectorList.length ; i++ )
	result = result.add( vectorList[i] );
      result = result.multiply( 1/vectorList.length );
    }
  return result;
}

function leftMostX ( points )
{
  var result = Infinity;
  if ( points instanceof Array )
  {
    for ( var i = 0 ; i < points.length ; i++ )
      if ( points[i] instanceof vector && points[i].x < result )
	result = points[i].x;
  }
  else if ( points instanceof vector )
    result = point.x;

  return result;
}

function rightMostX ( points )
{
  var result = -Infinity;
  if ( points instanceof Array )
  {
    for ( var i = 0 ; i < points.length ; i++ )
      if ( points[i] instanceof vector && points[i].x > result )
	result = points[i].x;
  }
  else if ( points instanceof vector )
    result = point.x

  return result;
}

function downMostY ( points )
{
  var result = -Infinity;
  if ( points instanceof Array )
  {
    for ( var i = 0 ; i < points.length ; i++ )
      if ( points[i] instanceof vector && points[i].y > result )
	result = points[i].y;
  }
  else if ( points instanceof vector )
    result = point.y;

  return result;
}

function upMostY ( points )
{
  var result = Infinity;
  if ( points instanceof Array )
  {
    for ( var i = 0 ; i < points.length ; i++ )
      if ( points[i] instanceof vector && points[i].y < result )
	result = points[i].y;
  }
  else if ( points instanceof vector )
    result = point.y;

  return result;
}

function axes( dirX, dirY, center )	//define new axes ( or XY axis without parameters ). Only needs the direction of one axis
{
  if ( center instanceof vector )
    this.center = center;
  else
    this.center = new vector( 0, 0 );

  if ( dirX instanceof vector )
    this.dirX = dirX.direction();
  else
    this.dirX = new vector( 1, 0 );

  if ( dirY instanceof vector )
    this.dirY = dirY.direction();
  else
     this.dirY = new vector( -this.dirX.y, this.dirX.x );
}

axes.prototype.project = function( vec, isFree )	//rotate vectors to work in the new axes
{
  if ( vec instanceof vector )
  {
    if ( isFree == false )				//consider 'vec' as a free vector or as a fixed vector
      vec = vec.minus( this.center );
    return new vector( vec.project( this.dirX ) , vec.project( this.dirY ) );
  }
}

axes.prototype.unproject = function( vec, isFree ) 	//rotate the result back to the original XY axes, assuming perpendicular axes
{
  if ( vec instanceof vector )
  {
    var result = new vector( vec.project( this.dirX.x, -this.dirX.y ) , vec.project( this.dirX.y, this.dirX.x ) );
    if ( isFree == false )				//consider 'vec' as a free vector or as a fixed vector
      result = result.add( this.center );
    return result;
  }
}

axes.prototype.rotate = function( ang )		//only the directions, does not affect the center
{
  this.dirX.rotate( ang );
  this.dirY.rotate( ang );
}

function rectangle( width, height, center, rotation )
{
  this.width = width;
  this.height = height;
  this.pos = center || new vector( 0, 0 );
  this.rotation = rotation || 0;
  this.points = this.samplePoints();
}

rectangle.prototype.samplePoints =  function( )		// creates a list of points inside the surface, in the coordinates of the center of the rectangle
{
  var points = [];
  points.push( new vector( this.width/2 , this.height/2 ) );		//inferior right corner
  points.push( new vector( -this.width/2 , this.height/2 ) );		//inferior left corner
  points.push( new vector( this.width/2 , -this.height/2 ) );		//superior right corner
  points.push( new vector( -this.width/2 , -this.height/2 ) );	//superior left corner

  return points;
}

rectangle.prototype.ptsInside = function ( item )//returns the points inside the shape. Item can be a point, a list of points, or another shape
{
  var result = [];

  //POINT
  if ( item instanceof vector )
  {
    var increment = item.minus( this.pos );
    if ( this.rotation != 0 )
    {
      var rectAxes = new axes();
      rectAxes.rotate( this.rotation );
      increment = rectAxes.project( increment );
    }
    var directions = [ false, false, false, false ];

    if ( increment.x >= 0 && increment.x < this.width/2 ) 	//right
      directions[0] = true;
    if ( increment.x < 0 && -increment.x < this.width/2 ) 	//left
      directions[1] = true;
    if ( increment.y >= 0 && increment.y < this.height/2 ) 	//beneath
      directions[2]= true;
    if ( increment.y < 0 && -increment.y < this.height/2 )	//above
      directions[3] = true;

    if ( ( directions[2] || directions[3] ) && (  directions[0] || directions[1] ) )
      result.push( item );
  }

  //LIST OF POINTS
  else if ( item instanceof Array )
  {
    for ( var i = 0 ; i < item.length ; i++ )
      if ( item[i] instanceof vector && this.ptsInside( item[i] ).length > 0 )
	  result.push( item[i] );
  }

  //ANOTHER SHAPE
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle || item instanceof polygon )
    for ( var i = 0 ; i < item.points.length ; i++ )
    {
      var pt = new vector ( item.points[i] );
      pt.rotate( item.rotation );
      pt = pt.add( item.pos );
      if ( this.ptsInside( pt ).length > 0 )
	result.push( pt );
    }
  return result; 		// return a list of points of collision
}

rectangle.prototype.areaInertia = function()
{
  return ( this.width*this.width + this.height*this.height )/12;
}

rectangle.prototype.overlapDistance = function ( point, vel )	//returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var rectAxes = new axes( undefined, undefined, this.pos );
      rectAxes.rotate( this.rotation );
      point = rectAxes.project( point, false );			//project as a fixed vector

      if ( vel instanceof vector && vel.modulus() != 0 )
      {
	vel = rectAxes.project( vel );
	var slopeVel = vel.y/vel.x;
	var a = point.y - slopeVel*point.x;

	/////////////

	if ( vel.x == 0 )			//point moved vertically, non lateral wall
	{
	  var x  = point.x;
	  if ( vel.y >= 0 )	//point moved downwards
	    var y = -this.height/2;	//top wall
	  else
	    var y = this.height/2;
	}
	else
	{
	  if ( vel.y >=0 )	//point moved downwards
	  {
	    if ( vel.x >= 0 )		//down-right
	      var x = -this.width/2;	//left wall
	    else // vel.x < 0		//down-left
	      var x = this.width/2;	//right wall
	    var y = a + slopeVel*x;
	    if ( y < -this.height/2 ) 	//no intersection, then intersection with upper wall
	    {
	      var y = -this.height/2;
	      var x = ( y - a )/slopeVel;
	    }
	  }
	  else //vel.y < 0		//point moved upwards
	  {
	    if ( vel.x >= 0 )		//up-right
	      var x = -this.width/2;	//left wall
	    else // vel.x < 0		//up-left
	      var x = this.width/2;	//right wall
	    var y = a + slopeVel*x;
	    if ( y > this.height/2 ) 	//no intersection, then intersection with bottom wall
	    {
	      var y = this.height/2;
	      var x = ( y - a )/slopeVel;
	    }
	  }
	}
	result = rectAxes.unproject( point.minus( x, y ).multiply( -1 ) );	//'result' is a distance vector, outwards from the center of the object
      }
      if ( vel.x ==0 && vel.y == 0 )	//if 'vel' is undefined or zero, locate the shortest boundary
      {
	if ( Math.abs( point.x ) >= Math.abs( point.y ) )
	{
	  if ( point.x >= 0 )					//closer to right wall
	    result = rectAxes.unproject( new vector( this.width/2 - point.x, 0 ) );
	  else							//closer to left wall
	    result = rectAxes.unproject( new vector( -this.width/2 - point.x, 0 ) );
	}
	else
	{
	  if ( point.y >= 0 )					//closer to bottom wall
	    result = rectAxes.unproject( new vector( 0 , this.height/2 - point.y ) );
	  else							//closer to top wall
	    result = rectAxes.unproject( new vector( 0 , -this.height/2 - point.y ) );
	}
      }
    }
    return result;
}

rectangle.prototype.getNormal = function( point ) 			///get the normal vector in the point of collision
{
    var result = undefined;

    if ( point instanceof vector )
    {
      var ang = angleCheck( point.minus( this.pos ).angle() - this.rotation );	//between [-PI, +PI)
      var alpha = Math.atan( this.height/this.width );				//between [0, PI/2)

      if (  ang >= -alpha && ang <= alpha )
	result = new vector( 1, 0 );
      else if (  ang > alpha && ang <= Math.PI - alpha )
	result = new vector( 0, 1 );
      else if (  ang > Math.PI - alpha || ang <= -Math.PI + alpha )
	result = new vector( -1, 0 );
      else	//(ang<-alpha && ang>-PI+alpha)
	result = new vector( 0, -1 );
      result.rotate( this.rotation );
    }
    return result;
}

function polygon( points )		//The polygon MUST be "monotone convex"
{
  this.rotation = 0;
  this.points = points.slice();
  this.faces = [];					//list of tangent vectors, ordered in counter-clockwise direction from points[0]
  this.normals = [];					//list of OUTER normal vectors,  ordered in counter-clockwise direction from points[0]

  //SET POINTS AROUND CENTER (ASSUMED AXES LOCATED IN TOP LEFT CORNER)
  this.pos = new vector( this.getWidth()/2 + leftMostX( this.points ) , this.getHeight()/2 + upMostY( this.points ) );
  for ( var i = 0 ; i < this.points.length ; i++ )
     this.points[i] = this.points[i].minus( this.pos );

  //CALCULATE SIDES
  for ( var i = 0 ; i < this.points.length -1 ; i++ )
    this.faces[i] = this.points[ i + 1 ].minus( this.points[i] );
  this.faces[ this.points.length -1 ] = this.points[0].minus ( this.points[ this.points.length -1 ] );

  //ORDER POINTS CLOCKWISELY

    //angles between vectors representing the faces
    var vecAng = [];
    for ( var i = 0 ; i < this.faces.length - 1 ; i++ )
      vecAng[i] = this.faces[i].angle( this.faces[ i + 1 ] );
    vecAng[ this.faces.length - 1 ] = this.faces[ this.faces.length - 1 ].angle( this.faces[ 0 ] );	//> 0 clockwise, < 0 counter-clockwise

    //check if the polygon is drawn clockwise or counter-clockwise
    var sum = 0;
    for ( var i = 0 ; i < vecAng.length ; i++ )
      sum += vecAng[i];											//> 0 clockwise, < 0 counter-clockwise

    //make it counter-clockwise
    if ( sum > 0 )
      this.points.reverse();

    //begin with the point of max angle ( for getNormal() )
    var maxAng = -Infinity;
    var maxIndex = 0;
    for ( var i = 0 ; i < this.points.length ; i++ )	//look for the minimum
    {
      var ang = this.points[i].angle2();
      if ( ang > maxAng )
      {
	maxAng = ang;
	maxIndex = i;
      }
    }
    for ( var i = 0 ; i < maxIndex ; i++ )	//reorder
      this.points.push( this.points.shift() );	//put the first ones at the end

  //RE-CALCULATE SIDES
  for ( var i = 0 ; i < this.points.length -1 ; i++ )
    this.faces[i] = this.points[ i + 1 ].minus( this.points[i] );
  this.faces[ this.points.length -1 ] = this.points[0].minus ( this.points[ this.points.length -1 ] );

  //CALCULATE OUTER NORMALS
  for ( var i = 0 ; i < this.faces.length ; i++ )
    this.normals[i] = new vector( -this.faces[i].y, this.faces[i].x );
}

polygon.prototype.getHeight = function()
{
  return ( downMostY( this.points ) - upMostY( this.points ) );
}

polygon.prototype.getWidth = function()
{
  return ( rightMostX( this.points ) - leftMostX( this.points ) );
}

polygon.prototype.area = function()
{
  var Area = 0;
  var vecAng = [];

  //Modulus of the cross-product (ie. area of paralellepipede formed by each pair of vectors)
  for ( var i = 0 ; i < this.points.length - 1 ; i++ )
    Area += this.points[i].modulus()*this.points[i+1].modulus()*Math.abs( Math.sin( this.points[i].angle( this.points[i+1] ) ) );
  Area += this.points[0].modulus()*this.points[this.points.length-1].modulus()*Math.abs( Math.sin( this.points[0].angle( this.points[this.points.length-1] ) ) );
  return Area/2;
}

polygon.prototype.areaInertia = function()//Calculation as the addition of triangles, assuming CONCAVE, and center of mass/rotation the center of the bounding box.
{
  //Areas of the triangles (between center and vertices)
  var Area = [];
  for ( var i = 0 ; i < this.points.length - 1 ; i++ )
    Area[i] = this.points[i].modulus()*this.points[i+1].modulus()*Math.abs( Math.sin( this.points[i].angle( this.points[i+1] ) ) );
  Area[this.points.length-1] = this.points[0].modulus()*this.points[this.points.length-1].modulus()*Math.abs( Math.sin( this.points[0].angle( this.points[this.points.length-1] ) ) );

  //Addition of MOIs for each triangle ( as function of the vertices' vectors )
  var aux = 0;
  for ( var i = 0 ; i < this.points.length-1 ; i++ )
    aux += ( this.points[i].project( this.points[i] )
	+ this.points[i].project( this.points[i+1] )
	+ this.points[i+1].project( this.points[i+1] ) ) * Area[i]/2;
  aux += ( this.points[0].project( this.points[0] )
  + this.points[0].project( this.points[this.points.length-1] )
  + this.points[this.points.length-1].project( this.points[this.points.length-1] ) ) * Area[this.points.length-1]/2;

  //Final factor
  return aux/( 6*this.area() );
}

polygon.prototype.isConvex = function ( angleList )
{
  var angles = angleCheck( angleList ) || this.getAngles();
  var result = false;

  for ( var i = 0 ; i < angles.length ; i++ )
    if ( angles[i] > Math.PI )
      result = true;
  return result;
}

polygon.prototype.ptsInside = function ( item )//returns the points inside the shape. Item can be a point, a list of points, or another shape
{
  var result = [];

  //POINT
  if ( item instanceof vector )
  {
    var inside = true;

    var polyAxes = new axes( undefined, undefined, this.pos );
    polyAxes.rotate( this.rotation );
    var pt = polyAxes.project( item, false );		//as fixed vector

    for ( var i = 0 ; i < this.normals.length ; i++ )
    {
      var increment = pt.minus( this.points[i] );
      if ( increment.project( this.normals[i] ) > 0 )
      {
	inside = false;
	i = this.normals.length;
      }
    }

    if ( inside )
      result.push( item );
  }

  //LIST OF POINTS
  else if ( item instanceof Array )
  {
    for ( var i = 0 ; i < item.length ; i++ )
      if ( item[i] instanceof vector && this.ptsInside( item[i] ).length > 0 )
	  result.push( item[i] );
  }

  //ANOTHER SHAPE
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle || item instanceof polygon )
    for ( var i = 0 ; i < item.points.length ; i++ )
    {
      var pt = new vector ( item.points[i] );
      pt.rotate( item.rotation );
      pt = pt.add( item.pos );
      if ( this.ptsInside( pt ).length > 0 )
	result.push( pt );
    }
  return result; 		// return a list of points of collision
}

polygon.prototype.overlapDistance = function ( point, vel )	//returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var polyAxes = new axes( undefined, undefined, this.pos );
      polyAxes.rotate( this.rotation );
      point = polyAxes.project( point, false );			//project as a fixed vector

      if ( vel instanceof vector && vel.modulus() != 0 )
      {
	if ( vel.x != 0 )		//nonvertical velocity
	{
	  vel = polyAxes.project( vel );
	  var slopeVel	= vel.y/vel.x;
	  var aV = point.y - slopeVel*point.x;

	  for ( var i = 0 ; i < this.points.length ; i++ )
	    if ( vel.project( this.normals[i] ) < 0 )			//condition for a face to have been crossed by the point with this velocity
	    {
	      //CALCULATE INTERSECTION WITH EACH SEGMENT'S RECT
	      if ( this.faces[i].x != 0 )	//nonvertical face
	      {
		var slopeFace = this.faces[i].y/this.faces[i].x;
		var aF = this.points[i].y - slopeFace*this.points[i].x;
		var x = ( aV - aF )/( slopeFace - slopeVel );
		var y = aV + slopeVel*x;
	      }
	      else	//vertical face, nonvertical velocity
	      {
		var aV = point.y - slopeVel*point.x;
		var x = this.points[i].x;
		var y = aV + slopeVel*x;
	      }
	      ///CHECK THAT THE POINT IS IN THE SEGMENT
	      if ( i < this.points.length - 1 )
		if ( ( ( x > this.points[i].x && x < this.points[i+1].x ) || ( x < this.points[i].x && x > this.points[i+1].x ) ) &&
		  ( ( y > this.points[i].y && y < this.points[i+1].y ) || ( y < this.points[i].y && y > this.points[i+1].y ) ) )
		  i = this.points.length;	//exit loop, we found the desired point
	    }
	}
	else //vertical velocity
	  for ( var i = 0 ; i < this.points.length ; i++ )
	    if ( vel.project( this.normals[i] ) < 0 && this.faces[i].x != 0 )			//condition for a face to have been crossed by the point with this velocity
	    {
	      //CALCULATE INTERSECTION WITH EACH SEGMENT'S RECT
	      var slopeFace = this.faces[i].y/this.faces[i].x;
	      var aF = this.points[i].y - slopeFace*this.points[i].x;
	      var x = point.x;
	      var y = aF + slopeFace*x;

	      ///CHECK THAT THE POINT IS IN THE SEGMENT
	      if ( i < this.points.length - 1 )
		if ( ( ( x > this.points[i].x && x < this.points[i+1].x ) || ( x < this.points[i].x && x > this.points[i+1].x ) ) &&
		  ( ( y > this.points[i].y && y < this.points[i+1].y ) || ( y < this.points[i].y && y > this.points[i+1].y ) ) )
		  i = this.points.length;	//exit loop, we found the desired point
	    }

	result = polyAxes.unproject( point.minus( x, y ).multiply( -1 ) );	//'result' is a distance vector, outwards from the center of the object
      }
      if ( vel.x ==0 && vel.y == 0 )	//if 'vel' is undefined or zero, locate the shortest boundary
      {
	var p = [];
	for ( var i = 0 ; i < this.points.length ; i++ )
	{
	  if ( this.faces[i].x != 0 && this.faces[i].y != 0  )	//non-vertical, non-horizontal face
	  {
	    var slopeFace = this.faces[i].y/this.faces[i].x;
	    var slopeNormal = this.normals[i].y/this.normals[i].x;
	    var aF = this.points[i].y - slopeFace*this.points[i].x;
	    var aN = point.y - slopeNormal*point.x;
	    var x = ( aN - aF )/( slopeFace - slopeNormal );
	    var y = aN + slopeNormal*x;
	  }
	  else if ( this.faces[i].x == 0 ) //vertical face
	  {
	    var x = this.points[i].x;
	    var y = point.y;
	  }
	  else 				//horizontal face
	  {
	    var x = point.x;
	    var y = this.points[i].y;
	  }

	  if ( i < this.points.length - 1 )
	  {
	    if ( ( ( x > this.points[i].x && x < this.points[i+1].x ) || ( x < this.points[i].x && x > this.points[i+1].x ) ) &&
	      ( ( y > this.points[i].y && y < this.points[i+1].y ) || ( y < this.points[i].y && y > this.points[i+1].y ) ) )
	      p.push( new vector( x, y ) );
	  }
	  else
	    if ( ( ( x > this.points[i].x && x < this.points[0].x ) || ( x < this.points[i].x && x > this.points[0].x ) ) &&
	      ( ( y > this.points[i].y && y < this.points[0].y ) || ( y < this.points[i].y && y > this.points[0].y ) ) )
	      p.push( new vector( x, y ) );
	}

	var dmin = Infinity;
	var incrMin = undefined;
	for ( var i = 0 ; i < this.points.length ; i++ )
	{
	  if ( p[i] )
	  {
	    var incr = point.minus( p[i] );
	    var d = incr.modulus();
	    if ( d < dmin )
	    {
	      dmin = d;
	      incrMin = incr;
	    }
	  }
	}
	result = polyAxes.unproject( incrMin.multiply( -1 ) );	//'result' is a distance vector, outwards from the center of the object
      }
    }
    return result;
}

polygon.prototype.getNormal = function( point ) 			///get the normal vector in the point of collision
{
    var result = undefined;

    if ( point instanceof vector )
    {
      var ang = angleCheck2( point.minus( this.pos ).angle2() - this.rotation );	//between [0, 2PI)
      var alpha = [];
      for ( var i = 0 ; i < this.points.length ; i++ )
	alpha[i] = this.points[i].angle2();						//between [0, 2PI)

      for ( var i = 0 ; i < alpha.length - 1 ; i++ )
	if (  ang <= alpha[i] && ang > alpha[i+1] )
	  result = new vector( this.normals[i] );
      if (  result == undefined )
	result = new vector( this.normals[ alpha.length - 1 ] );
      result.rotate( this.rotation );
    }
    return result;
}

polygon.prototype.getAngles  = function ()	//retreive the INNER angles between the sides of the polygon. Angles between ( 0 , 2PI )
{
  var angList = [];
  for ( var i = 0 ; i < this.faces.length - 1 ; i++ )		//the angle between two segments is the complementary to the angle between vectors
    angList.push( Math.PI + this.faces[i].angle( this.faces[ i + 1 ] ) );
  angList.push( Math.PI + this.faces[ this.faces.length - 1 ].angle( this.faces[ 0 ] ) );
  return angList;
}

polygon.prototype.splitPolygon = function ( clockwise , startIndex, jump )	//split into a set of concave polygons. Returns the list of polygons
{
  var polygonList = [];

  if ( clockwise == undefined )
    clockwise = false;
  if ( jump == undefined )
    jump = false;

  var points = this.points.slice();
  var angles = this.getAngles();

  //REORDER IF IN CLOCKWISE CASE: 'S' patterns fail in one direction, but not in the other
  if ( clockwise )
  {
    points.reverse();
    points.unshift( points.pop() ); 			//put last one first
    angles.reverse();
    angles.push( angles.shift() );//angles.push( angles.shift() );		 //put first one last (twice)
  }

  if ( startIndex == undefined )
  {
    //LOOK FOR A LAST CONVEX ANGLE TO BEGIN THE ALGORITHM WITH
    startIndex = 0;
    for ( var i = 0 ; i < angles.length - 1 ; i++ )
      if ( angles[i] > Math.PI && angles[i+1] < Math.PI )
	startIndex = i + 1;

    //REORDER THE PATH TO BEGIN WITH THIS ANGLE
    for ( var i = 0 ; i < startIndex ; i++ )
    {
      points.push( points.shift() );	//put the first ones at the end
      angles.push( angles.shift() );
    }
  }
  else	// BEGIN WITH THE GIVEN ANGLE
  {
    if ( clockwise )
      startIndex = points.length - startIndex;
    for ( var i = 0 ; i < startIndex ; i++ )
    {
      points.push( points.shift() );	//put the first ones at the end
      angles.push( angles.shift() );
    }
    while( angles[0] > Math.PI )	//look for the closest last concave
    {
      points.push( points.shift() );	//put the first ones at the end
      angles.push( angles.shift() );
    }
  }
  //CHECK EACH CONSECUTIVE ANGLE WHILE FORMING A POLYGON, AND SPLIT WHERE IT BECOMES CONVEX
  var angSum = 0;
  var newAng = 0;
  for ( var i = 0 ; i < angles.length ; i++ )
  {
    if ( i > 1 && i < angles.length - 1 )
      if ( !clockwise )
	newAng = Math.PI + points[i+1].minus( points[i] ).angle( points[0].minus( points[i+1] ) );	//angle if we closed the polygon here
      else
	newAng = Math.PI - points[i+1].minus( points[i] ).angle( points[0].minus( points[i+1] ) );

    //CONVEXITY CHECK: check A) if the polygon is convex so far ( ie. if we closed it, the new two angles are < PI ) or B) the current angle would make it convex (> PI)
    if ( angles[i] > Math.PI || ( i < angles.length -1 &&  i*Math.PI - angSum - newAng > Math.PI ) || ( i > 1 && newAng > Math.PI ) )
    {
      //CHOOSE THE SLICE POINT
      if ( ! ( ( i < angles.length -1 &&  i*Math.PI - angSum - newAng > Math.PI )  ||  ( i > 1 && newAng > Math.PI ) ) )
	i++;

      //DIVIDE THE POLYGON AT THE CONFLICTING POINT
      var points1 = points.slice( 0 , i + 1 ) ;
      var points2 = points.slice( i );

      var P1 = new polygon( points1 );

      //CHECK THAT THE POLYGONS DO NOT OVERLAP (AND MAKE CORRECTIONS)
      var failure = false;
      while( !failure && P1.ptsInside( points2.slice( 1 ) ).length > 0  )	//don't count the first point of P2, as it is shared with P1
      {
	if ( P1.points.length > 3 )
	{
	  points1.pop();						//remove the last point of P1 (that is shared with P2)
	  points2.unshift( points1[ points1.length - 1 ] );	//make P2 begin in the new last point of P1 (so that they share it)
	  P1 = new polygon( points1 );
	}
	else
	{
	  failure = true;	//if it is reduced to a triangle and there is still overlap, the algorithm has failed -> solve clockwise
	  P1 = undefined;
	}
      }

      //SAVE POLYGON P1 AND CONTINUE DIVIDING P2
      if ( !failure )
      {
	P1.pos = this.pos.add( P1.pos );				//P1 and P2 are initialized respect to the coordinates of the original polygon
	polygonList.push( P1 );

	var P2 = new polygon( points2.concat( points[0] ) );	//close P2 with the first point of P1
	P2.pos = this.pos.add( P2.pos );
	polygonList = polygonList.concat( P2.splitPolygon( clockwise ) );
      }
      else
      //IF DIVISION FAILED (point overlap), SOLVE AGAIN OPPOSITE DIRECTION
      {
	if ( !jump )
	{
	  if ( clockwise )
	    startIndex = points.length - startIndex;
	  polygonList = polygonList.concat( this.splitPolygon( !clockwise , startIndex, true ) ); //if it fails again ('saddle' point), JUMP to next concave point
	}
	else	//'SADDLE' POINT: jump to next concave point and begin again
	{
	  var index = 0;
	  for ( var j = 0 ; j < angles.length ; j++ )	//look for the next concave point
	    if ( angles[j] > Math.PI )
	    {
	      index = j;
	      j = angles.length;
	    }
	  if ( clockwise )
	    index = ( points.length - startIndex - index - 1 ) % ( this.points.length );
	  else
	    index = ( startIndex + index + 1 ) % ( this.points.length );
	  polygonList = polygonList.concat( this.splitPolygon( !clockwise , index, false ) );
	}
      }
      i = angles.length;	//exit loop
    }
    angSum += angles[i];
  }

  //BASE CASE FOR RECURSION
  if ( polygonList.length == 0 )
    polygonList = [ this ];
  return polygonList;
}

// function mergePolygons( polygonList )		//merges the adjacent polygons in the list so that bigger concave polygons result
// {
//   var returnList = [];
//   for ( var i = 0 ; i < polygonList.length ; i++ )
//     for ( var j = i + 1 ; j < polygonList.length ; j++ )
//     {
//       var pts = [];
//       //check if they have two points in common
//       for ( var k = 0 ; k < polygonList[i].points.length ; k++ )
// 	for ( var n = 0 ; n < polygonList[j].points.length ; n++ )
// 	  if ( polygonList[i].pos.add( polygonList[i].points[k] ).equals( polygonList[j].pos.add( polygonList[j].points[n] ) ) )
// 	  {
// 	    pts.push( polygonList[i].pos.add( polygonList[i].points[k] ) );
// 	    n = polygonList[j].points.length;
// 	  }
//       if ( pts.length > 0 )
//       {
// 	//JOIN THE POLYGONS BY THE COMMON POINTS
// 	var points1 =  polygonList[i].globalPoints();	//counter-clockwise
// 	var points2 =  polygonList[j].globalPoints();
//
// 	  //Common boundary search
// 	  while( !points1[0].equals( pts[0] ) )// adjust the pattern for polygon 1 at beginning//todo
// 	    points1.push( points1.shift() );
//
// 	  points2.reverse();				//clockwise
// 	  while( !points2[0].equals( pts[pts.length-1] ) )// adjust the pattern for polygon 2 at beginning//todo
// 	    points2.push( points2.shift() );
//
// 	for ( var l = 0 ; l < pts.length ; l++ )	//begin with last point of boundary
// 	  points1.push( points1.shift() );
// 	points1 = points1.slice( 0 , points1.length - pts.length + 1 ); //leave only non common points (and beginning and ending)
//
// 	points2.reverse();			//back to anti-clockwise
// 	points2.unshift( points2.pop() );	//last one at beginning
// 	points2 = points2.slice( 0 , points2.length - pts.length + 1 );	//truncate and leave only non common points (and beginning and ending of boundary)
//
// 	var points = points1.concat( points2.slice( 1 , points2.length - 1  ) );
//
// 	//join them if not convex
// 	var newPol = new polygon( points );
// 	if ( !newPol.isConvex() )
// 	{
// 	  //update the list and continue joining
// 	  var auxList = polygonList.slice();
// 	  auxList.splice( j, 1 );	//j>i
// 	  auxList.splice( i, 1 );
// 	  auxList.push( newPol );
// 	  returnList = mergePolygons( auxList );
// 	  i = polygonList.length;
// 	}
//       }
//     }
//
//   //BASE CASE FOR RECURSION
//   if ( returnList.length == 0 )
//     returnList = polygonList.slice();
//   return returnList;
// }

polygon.prototype.globalPoints = function()
{
  var retList = this.points.slice();
  for ( var i = 0 ; i < retList.length ; i++ )
    retList[i] = retList[i].add( this.pos );
  return retList;
}

function circle( radius, center )
{
  this.pos = center || new vector( 0, 0 );
  this.radius = radius || 10;
  this.points = this.samplePoints();
}

circle.prototype.samplePoints =  function( number )
{
  number = number || 8;
  var points = [];
  for ( var i = 0 ; i < number ; i++ )
    points.push( new vector( this.radius*Math.cos(2*i*Math.PI/number) , this.radius*Math.sin(2*i*Math.PI/number) ) );
  return points;
}

circle.prototype.ptsInside = function ( item )//returns the points inside the shape. Item can be a point, a list of points, or another shape
{
  var result = [];

  //POINT
  if ( item instanceof vector )
  {
    var increment = this.pos.minus( item );
    if ( increment.modulus() < this.radius )
      result.push( item );
  }

  //LIST OF POINTS
  else if ( item instanceof Array )
  {
    for ( var i = 0 ; i < item.length ; i++ )
      if ( item[i] instanceof vector && this.ptsInside( item[i] ).length > 0 )
	result.push( item[i] );
  }

  //ANOTHER SHAPE
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle || item instanceof polygon )
    for ( var i = 0 ; i < item.points.length ; i++ )
    {
      var pt = new vector ( item.points[i] );
      pt.rotate( item.rotation );
      pt = pt.add( item.pos );
      if ( this.ptsInside( pt ).length > 0 )
	result.push( pt );
    }
  return result;	//  return 'undefined' or the point of collision
}

circle.prototype.areaInertia = function()
{
  return ( this.radius*this.radius )/2;
}

circle.prototype.overlapDistance = function ( point, vel )	//returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var circAxes = new axes( undefined, undefined, this.pos );
      point = circAxes.project( point, false );			//project as a fixed vector

      if ( vel instanceof vector && vel.modulus() != 0 )
      {
	var slopeVel = vel.y/vel.x;
	var offset = point.y - slopeVel*point.x;

	/////////////

	if ( vel.x != 0 )
	{
	  var a = 1 + slopeVel*slopeVel;
	  var b = 2*slopeVel*offset;
	  var c = offset*offset - this.radius*this.radius;

	  if ( vel.x > 0 )						//point moved in right direction
	    var x = ( -b - Math.sqrt( b*b - 4*a*c ) )/( 2*a );		//leftmost point in boundary
	  else
	    var x = ( -b + Math.sqrt( b*b - 4*a*c ) )/( 2*a );		//rightmost point in boundary

	  var y = offset + slopeVel*x;
	}
	else		//vertical movement
	{
	  if ( vel.y >= 0 )							//point moved downwards
	    var y = -Math.sqrt( this.radius*this.radius - point.x*point.x );	//top boundary
	  else
	    var y = Math.sqrt( this.radius*this.radius - point.x*point.x );	//botom boundary
	}
      }
      else		//if 'vel' is undefined or zero, locate the shortest boundary
      {
	var ang = point.angle();
	var x = this.radius*Math.cos( ang );
	var y = this.radius*Math.sin( ang );
      }
      result = circAxes.unproject( point.minus( x, y ).multiply( -1 ) );	//return an outwards vector
    }
    return result;
}

circle.prototype.getNormal = function( point ) 			///get the normal vector in the point of collision
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var ang = point.minus( this.pos ).angle();
      result = new vector( this.radius*Math.cos( ang ) , this.radius*Math.sin( ang ) );
    }
    return result;
}

function ellipse( radiusA, radiusB, center, rotation )	//radius A is the Y axis
{
  this.pos = center || new vector( 0, 0 );
  this.radiusA = radiusA || 20;
  this.radiusB = radiusB || 10;
  this.rotation = rotation || 0;
  this.points = this.samplePoints();
}

ellipse.prototype.samplePoints =  function( number )
{
  number = number || 12;
  var points = [];
  for ( var i = 0 ; i < number ; i++ )
    points.push( new vector( this.radiusB*Math.cos(2*i*Math.PI/number) , this.radiusA*Math.sin(2*i*Math.PI/number) ) );
  return points;
}

ellipse.prototype.areaInertia = function()
{
  return ( this.radiusA*this.radiusA + this.radiusB*this.radiusB )/4;
}

ellipse.prototype.ptsInside = function ( item )//returns the points inside the shape. Item can be a point, a list of points, or another shape
{
  var result = [];

  //POINT
  if ( item instanceof vector )
  {
    var increment = this.pos.minus( item );
    if ( this.rotation != 0 )
    {
      var ellipseAxes = new axes();
      ellipseAxes.rotate( this.rotation );
      increment = ellipseAxes.project( increment );
    }
    if ( increment.x*increment.x/(this.radiusB*this.radiusB) + increment.y*increment.y/(this.radiusA*this.radiusA) < 1 )
      result.push( item );
  }

  //LIST OF POINTS
  else if ( item instanceof Array )
  {
    for ( var i = 0 ; i < item.length ; i++ )
      if ( item[i] instanceof vector && this.ptsInside( item[i] ).length > 0 )
	result.push( item[i] );
  }

  //ANOTHER SHAPE
  else if ( item instanceof rectangle || item instanceof ellipse || item instanceof circle || item instanceof polygon )
    for ( var i = 0 ; i < item.points.length ; i++ )
      {
	var pt = new vector ( item.points[i] );
	pt.rotate( item.rotation );
	pt = pt.add( item.pos );
	if ( this.ptsInside( pt ).length > 0 )
	  result.push( pt );
      }
  return result;		//  return 'undefined' or the point of collision
}

ellipse.prototype.overlapDistance = function ( point, vel )	//returns the distance from point to object boundary, in the direction of 'vel'
{
    var result = undefined;
    if ( point instanceof vector )
    {
      var ellipseAxes = new axes( undefined, undefined, this.pos );
      ellipseAxes.rotate( this.rotation );
      point = ellipseAxes.project( point, false );			//project as a fixed vector

      if ( vel instanceof vector && vel.modulus() != 0 )
      {
	vel = ellipseAxes.project( vel );
	var slopeVel = vel.y/vel.x;
	var offset = point.y - slopeVel*point.x;

	/////////////

	if ( vel.x != 0 )
	{
	  var a = 1/(this.radiusB*this.radiusB) + slopeVel*slopeVel/(this.radiusA*this.radiusA);
	  var b = 2*slopeVel*offset/(this.radiusA*this.radiusA);
	  var c = offset*offset/(this.radiusA*this.radiusA) - 1;

	  if ( vel.x > 0 )						//point moved in right direction
	    var x = ( -b - Math.sqrt( b*b - 4*a*c ) )/( 2*a );		//leftmost point in boundary
	  else
	    var x = ( -b + Math.sqrt( b*b - 4*a*c ) )/( 2*a );		//rightmost point in boundary

	  var y = offset + slopeVel*x;
	}
	else		//vertical movement
	{
	  if ( vel.y >= 0 )							//point moved downwards
	    var y = -this.radiusA*Math.sqrt( 1 - point.x*point.x/( this.radiusB*this.radiusB ) );	//top boundary
	  else
	    var y =  this.radiusA*Math.sqrt( 1 - point.x*point.x/( this.radiusB*this.radiusB ) );	//botom boundary
	}
      }
      else//if 'vel' is undefined or zero, approximate the closest boundary by the one in radial direction ( no exact analytical solution )
      {
	var ang = point.angle();
	var x = this.radiusB * Math.cos( ang );
	var y = this.radiusA * Math.sin( ang );
      }
      result = ellipseAxes.unproject( point.minus( x, y ).multiply(-1) );	//return an outwards vector
    }
      return result;
}

ellipse.prototype.getNormal = function( point ) 			///get the normal vector in the point of collision
{
  var result = undefined;
  if ( point instanceof vector )
  {
    var ang = angleCheck( point.minus( this.pos ).angle() - this.rotation );	//between [-PI, +PI)
    result = new vector( this.radiusA*Math.cos( ang ) , this.radiusB*Math.sin( ang ) );
    result.rotate( this.rotation );
  }
  return result;
}

/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
/////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function rotation( angVelocity, friction )
{
  if ( angVelocity == undefined )
    angVelocity = shiftAngle;
  this.angVelocity = angVelocity;
  this.friction = friction || 0;
}

rotation.prototype.advance = function()
{
  if ( this.friction != 0 )
    this.accelerate( -this.friction )
  return this.angVelocity;
}

rotation.prototype.isFinished = function()
{
    if ( this.angVelocity == 0 )
      return true;
    else
      return false;
}

rotation.prototype.accelerate = function ( angAcc )
{
    angAcc = angAcc || 0.005;

  if ( this.angVelocity >= 0 )
  {
    this.angVelocity += angAcc;
    if ( this.angVelocity < 0 )
      this.angVelocity = 0;
  }
  else
  {
    this.angVelocity -= angAcc;
    if ( this.angVelocity > 0 )
      this.angVelocity = 0;
  }
}


function movement ( initialDir, speed, friction, oriented )
{
    if ( initialDir instanceof vector )
      this.direction 	= new vector( initialDir );
    else
       this.direction 	= new vector( 0, -1 );
    this.speed 		= speed || baseSpeed;
    this.friction 	= friction || 0;
    this.accelState 	= 0;
    if ( oriented == undefined )
      oriented	= true;
    this.oriented 	= oriented;	//indicates if the orientation of the element is to be the same as the direction of movement

    this.cancel		= false;
    this.replace	= false;
    this.components	= [];		//list with extra components to the movement, to add vectorially

    this.RAngle	= undefined;
    this.RCurv	= undefined;
    this.RSpeed	= undefined;
}

movement.prototype.velocity = function ()
{
  return this.direction.multiply( this.speed );
}

movement.prototype.advance = function () ///Returns the increment for each frame
{
  //Modifiers
  if ( this.accelState == 1 )				//accelerate
    this.accelerate();
  else if ( this.accelState == 2 )			//decelerate
    this.decelerate();
  if ( this.friction > 0 && this.accelState == 0 )	//none
    this.decelerate( this.friction )

  //Random components
  if ( this.RSpeed || this.RCurv || this.RAngle )
    this.randomize();
  if ( this.RCurv )
    this.direction.rotate( this.curvature*this.speed );

  //Movement itself
  var result = this.direction.multiply( this.speed );

  //Add other components
  for ( var i = 0 ; i < this.components.length ; i++ )
    result = result.add( this.components[i].advance() );

  return result;
}

movement.prototype.isFinished = function ()
{
    if ( this.speed == 0 )
      return true;
    else
      return false;
}

movement.prototype.accelerate = function ( acceleration )
{
    acceleration = acceleration || baseAccel;
    this.speed = this.speed + acceleration;
}

movement.prototype.decelerate = function ( deceleration )
{
    deceleration = deceleration || baseAccel*2;
    var newSpeed = this.speed - deceleration;
    if ( newSpeed <= 0 )
      this.speed = 0;						//this will end and eliminate the movement from the list when move() is invoked
    else
    {
      var distance = this.speed*( this.steps - this.currentSteps );
      this.steps = this.currentSteps + distance/newSpeed;
      this.speed = newSpeed;
    }
}

function arrowMovement ( dir, speed, friction )
{
    this.up 	= false;
    this.down  	= false;
    this.right	= false;
    this.left	= false;

    movement.call( this, undefined, speed, friction );
    this.addDir( dir );
}
arrowMovement.prototype = new movement();
arrowMovement.prototype.constructor = arrowMovement;

arrowMovement.prototype.addDir = function( dir, add )		//add/substract a component to the movement and return resulting direction
{
  if ( add == undefined )
    add = true;
  if ( dir )
  {
    if ( dir == 'up' )
	this.up  = add;
    else if ( dir == 'down' )
	this.down  = add;
    else if ( dir == 'right' )
	this.right = add;
    else if ( dir == 'left' )
	this.left = add;
      ////////////////////
    var direction = new vector( 0, 0 );
    if ( this.up )
      direction = direction.add( 0, -1 );
    if ( this.down )
      direction = direction.add( 0, 1 );
    if ( this.right )
      direction = direction.add( 1, 0 );
    if ( this.left )
      direction = direction.add( -1, 0 );
  }
  if( direction.x != 0 || direction.y != 0 )
    this.direction = direction.direction();
}

arrowMovement.prototype.isFinished = function ()
{
    return ( !this.up && !this.down && !this.right && !this.left );
}

function rectMovement( origPos, destPos, speed )
{
  movement.call( this, undefined, speed );

  var auxVector = new vector();

  this.origPosition = origPos || auxVector;
  this.destPosition = destPos || auxVector;

  var increment 	= this.destPosition.minus( this.origPosition );
  this.direction 	= increment.direction();
  this.distance 	= increment.modulus();
  this.steps 		= this.distance/this.speed;
  this.currentSteps 	= 0;
}
rectMovement.prototype = new movement();
rectMovement.prototype.constructor = rectMovement;

rectMovement.prototype.advance = function()
{
  this.currentSteps++;
  return movement.prototype.advance.call( this );
}

rectMovement.prototype.isFinished = function ()
{
  if ( this.currentSteps >= this.steps || this.speed == 0 )
    return true;
  else
    return false;
}

rectMovement.prototype.accelerate = function ( acceleration )
{
  acceleration = acceleration || baseAccel;
  var newSpeed = this.speed + acceleration;
  this.steps = this.distance/newSpeed;
  this.currentSteps = this.speed*this.currentSteps*this.steps/this.distance;
  this.speed = newSpeed;
}

rectMovement.prototype.setSpeed = function ( newSpeed ) //change speed before the movement begins (while in queue)
{
  if ( newSpeed && this.currentSteps == 0 )
  {
    this.speed = newSpeed;
    this.steps = this.distance/this.speed;
  }
}

function landMovement( origPos, destPos, speed )			//movement with a constant deceleration that ends in the destination with velocity 0
{
  rectMovement.call( this, origPos, destPos, speed );
  this.deceleration = 0.5*this.speed*this.speed/this.distance;
}
landMovement.prototype = new rectMovement();
landMovement.prototype.constructor = landMovement;

landMovement.prototype.advance = function()
{
  this.decelerate( this.deceleration );
  return rectMovement.prototype.advance.call( this );
}

function softMovement( origPos, destPos, speed, dist ,percentage )	//hybrid movement:'rect' movement that, at a certain point becomes a land movement
{
  rectMovement.call( this, origPos, destPos, speed );
  this.landing  = false;
  this.changed  = false;
  this.dist	= dist || 20;			//indicates the max distance to destination point to begin 'landing'
  this.percentage = percentage || 0.9;		//indicates the max percentage point of the movement to begin 'landing' (default: 90%)
}
softMovement.prototype = new rectMovement();
softMovement.prototype.constructor = softMovement;

softMovement.prototype.advance = function()
{
  if ( !this.changed && 1 - ( this.steps - this.currentSteps )/this.steps < this.percentage && ( this.steps - this.currentSteps )*this.speed > this.dist )
    return rectMovement.prototype.advance.call( this );
  else if ( !this.landing )
  {
    this.landing = true;
    this.changed = true;
    landMovement.call( this, this.origPosition.add( this.velocity().multiply( this.currentSteps ) ), this.destPosition, this.speed );
  }
  if ( this.landing )
    return landMovement.prototype.advance.call( this );
}

softMovement.prototype.cancelLand = function()
{
  this.dist = 0;
  this.percentage = 1;
}

function circleMovement( initialDir, curvature, speed )
{
  movement.call( this, initialDir, speed );
  this.curvature = curvature || 5*Math.PI/180;
}
circleMovement.prototype = new movement();
circleMovement.prototype.constructor = circleMovement;

circleMovement.prototype.advance = function()
{
    this.direction.rotate( this.curvature*this.speed );
    return movement.prototype.advance.call( this );
}

function curvedMovement( origPos, destPos, /*curvature,*/ speed )
{
  rectMovement.call( this, origPos, destPos, undefined, speed );//use rectMovement as a prototype for parametric movement
  this.direction.rotate( -Math.PI/2 );
  this.radius 		= this.distance/2; //Max curvature. input radius for more complexity?
  this.arch		= this.radius*Math.PI;
  this.steps 		= this.arch/this.speed;
  this.curvature	= Math.PI/this.steps;
}
curvedMovement.prototype = new rectMovement();
curvedMovement.prototype.constructor = curvedMovement;

curvedMovement.prototype.advance = function()
{
    this.currentSteps++;
    this.direction.rotate( this.curvature*this.speed );
    return movement.prototype.advance.call( this );
}

function carMovement( initialDir, speed )
{
  movement.call( this, initialDir, speed, baseAccel/2 );
  this.steerState = 0;					// 0 - none, 1 - steer right , 2 - steer left
}
carMovement.prototype = new movement();
carMovement.prototype.constructor = carMovement;

carMovement.prototype.advance = function ()
{
  if ( this.steerState == 1 )
    this.direction.rotate( shiftAngle );
  else if ( this.steerState == 2 )
    this.direction.rotate( -shiftAngle );

  return movement.prototype.advance.call( this );
}

function chaseMovement( owner, target, speed )
{
  rectMovement.call( this, target.pos, speed );

  this.target	= target;
  this.owner    = owner;
}
chaseMovement.prototype = new movement();
chaseMovement.prototype.constructor = movement;

chaseMovement.prototype.advance = function()
{
  var increment 	= this.target.pos.minus( this.owner.pos );
  this.direction 	= increment.direction();
  var result		= movement.prototype.advance.call( this );

  return result;
}

chaseMovement.prototype.isFinished = function ()
{
    var result = false;
    if ( this.target && overlapPoints( this.owner , this.target ) )
      result = true;

    return result;
}

movement.prototype.randomSpeed = function( avgSpeed,stdSpeed, avgPeriod, stdPeriod )
{
    this.RSpeed = {};
    this.RSpeed.avg  = avgSpeed || baseSpeed/2;
    this.RSpeed.std  = stdSpeed || baseSpeed/2;

    this.RSpeed.avgPeriod = avgPeriod || 5/this.avgSpeed;
    this.RSpeed.stdPeriod = stdPeriod || 2.5/this.avgSpeed;
    this.RSpeed.period  = this.RSpeed.avgPeriod;
    this.RSpeed.count   = 0;
}

movement.prototype.randomCurv = function( avgCurv,stdCurv, avgPeriod, stdPeriod )
{
    this.RCurv = {};
    this.curvature = 0;
    this.RCurv.avg  = avgCurv || 0;
    this.RCurv.std  = stdCurv || 15*Math.PI/180;

    this.RCurv.avgPeriod = avgPeriod || 10;
    this.RCurv.stdPeriod = stdPeriod || 5;
    this.RCurv.period  = this.RCurv.avgPeriod;
    this.RCurv.count   = 0;
}

movement.prototype.randomAngle = function( avgAngle, stdAngle, avgPeriod, stdPeriod )
{
    this.RAngle = {};
    this.RAngle.avg  = avgAngle || 0;
    this.RAngle.std  = stdAngle || 2*Math.PI;

    this.RAngle.avgPeriod = avgPeriod || 10;
    this.RAngle.stdPeriod = stdPeriod || 5;
    this.RAngle.period  = this.RAngle.avgPeriod;
    this.RAngle.count   = 0;
}

movement.prototype.randomize = function()
{
  if ( this.RSpeed )
  {
    this.RSpeed.count++;
    if ( this.RSpeed.count >= this.RSpeed.period )
    {
      this.speed = this.RSpeed.avg + this.RSpeed.std*( Math.random() - 0.5 );
      this.RSpeed.period = this.RSpeed.avgPeriod + this.RSpeed.stdPeriod*( Math.random() - 0.5 );
      this.RSpeed.count = 0;
      this.RSpeed.avgPeriod = 5/this.speed;
      this.RSpeed.stdPeriod = 2.5/this.speed;
    }
  }
  if ( this.RCurv )
  {
    this.RCurv.count++;
    if ( this.RCurv.count >= this.RCurv.period )
    {
      this.curvature = this.RCurv.avg + this.RCurv.std*( Math.random() - 0.5 );
      this.RCurv.period = this.RCurv.avgPeriod + this.RCurv.stdPeriod*( Math.random() - 0.5 );
      this.RCurv.count = 0;
      this.RCurv.avgPeriod = 5/this.speed;
      this.RCurv.stdPeriod = 2.5/this.speed;
    }
  }
  if ( this.RAngle )
  {
    this.RAngle.count++;
    if ( this.RAngle.count >= this.RAngle.period )
    {
      var angle = this.Rangle.avg + this.RAngle.std*( Math.random() - 0.5 );
      this.direction = new vector( Math.cos( angle ), Math.sin( angle ) );
      this.RAngle.period = this.RAngle.avgPeriod + this.RAngle.stdPeriod*( Math.random() - 0.5 );
      this.RAngle.count = 0;
      this.RAngle.avgPeriod = 5/this.speed;
      this.RAngle.stdPeriod = 2.5/this.speed;
    }
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

function part( id , parentElement, shape, coordinates )	//geometric shape that is component of an element (it is attached to the element)
{
  this.parentElement = parentElement;
  if ( id )				//indicates that the information is to be extracted from the SVG document, otherwise from the 'shape' parameter
  {
    this.SVGNode = document.getElementById( id );
    this.id = id;
  //   this.SVGNode.setAttribute( 'display' , 'none' );TODO

    //DIMENSIONS
    this.height = this.SVGNode.getAttribute( 'height' );
    if ( this.height == undefined || this.height == '100%' )
    {
        this.height = this.parentElement.SVGNode.getAttribute( 'height' );
	if ( this.height == undefined || this.height == '100%' )
	  this.height = 10.0;
    }
    this.height = parseFloat( this.height );

    this.width	= this.SVGNode.getAttribute( 'width' );
    if ( this.width == undefined || this.width == '100%' )
    {
        this.width = this.parentElement.SVGNode.getAttribute( 'width' );
	if ( this.width == undefined || this.width == '100%' )
	  this.width = this.height*window.innerWidth/window.innerHeight;
    }
    this.width = parseFloat( this.width );
    this.angle 	= Math.PI/180*parseFloat( this.SVGNode.getAttribute( 'rotation' ) ) || parentElement.angle || 0;

    ///LOCATION - the part coordinates are considered relative to the element, unless the element has no 'xy' parameters defined in the SVG document
    if ( coordinates )
      this.pos = coordinates;								//center of the object
    else
    {
      var readX = parseFloat( this.SVGNode.getAttribute( 'x' ) ) || 0;			//'SVG coords' are top-left corners
      var readY = parseFloat( this.SVGNode.getAttribute( 'y' ) ) || 0;
      this.pos = new vector( readX + this.width/2, readY + this.height/2 );		//center of the object
    }
    var readShape = this.SVGNode.getAttribute( 'shape' ) || this.parentElement.SVGNode.getAttribute( 'shape' ) || '';
  }
  else
  {
    this.id = '';

    //DIMENSIONS
    this.height = this.parentElement.SVGNode.getAttribute( 'height' );
    if ( this.height == undefined || this.height == '100%' )
      this.height = 10.0;
    else
      this.height = parseFloat( this.height );

    this.width = this.parentElement.SVGNode.getAttribute( 'width' );
    if ( this.width == undefined || this.width == '100%' )
      this.width = this.height*window.innerWidth/window.innerHeight;
    else
      this.width = parseFloat( this.width );

    this.angle 	= parentElement.angle || 0;
    this.pos 	= coordinates || new vector( this.width/2, this.height/2 );
    var readShape = this.parentElement.SVGNode.getAttribute( 'shape' )  || '';
  }

  //DETERMINATION OF THE 'SHAPE' OBJECT THAT REPRESENTS THE PART
  if ( readShape == 'circle' || shape instanceof circle )
    this.shape = shape || this.getCircle();
  else if ( readShape == 'ellipse' || shape instanceof ellipse )
    this.shape = shape || this.getEllipse();

  //The default if ommited would be a polygon (if node is 'path'), or rectangle.
    // A) parameter node is a path ( or there is a 'shape' parameter )
    else if ( ( this.SVGNode && this.SVGNode.nodeName == 'path' && pathIsValidPolygon( this.SVGNode ) ) || shape instanceof polygon )
    {
      this.shape = shape || new polygon( pointsFromPath( this.SVGNode ) );
      this.height = this.shape.getHeight();					//only the polygon does not need manual description in the 'width,'height', fields
      this.width  = this.shape.getWidth();
      this.pos = new vector( this.shape.pos );
    }
    //B) no parameter node (ie. 'id' is undefined), and only element in the SVG parent node is a valid 'path'
    else if( this.parentElement.group.childElementCount == 1
          && this.parentElement.group.firstElementChild.nodeName == 'path' && pathIsValidPolygon( this.parentElement.group.firstElementChild ) )
    {
      this.shape = shape || new polygon( pointsFromPath( this.parentElement.group.firstElementChild ) );
      this.height = this.shape.getHeight();					//only the polygon does not need manual description in the 'width,'height', fields
      this.width  = this.shape.getWidth();
      this.pos = new vector( this.shape.pos );
    }
  //Otherwise, default to rectangle
  else
    this.shape = shape || this.getRectangle();
}

part.prototype.getShape = function ( newPos, angle )		//updates the information of the part's shape and returns it.
{
  if ( newPos instanceof vector )
    this.shape.pos = newPos;
  else
    this.shape.pos = this.parentElement.pos.add( this.pos );		//global coordinates

  if ( angle )
    this.shape.rotation = angle;
  else
  {
    var parentAng = this.parentElement.angle || 0;
    this.shape.rotation = angleCheck( this.angle + parentAng );
  }

  return this.shape;
}

part.prototype.getRectangle = function()
{
  return new rectangle( this.width, this.height, this.pos, this.angle );
}

part.prototype.getCircle = function()
{
  return new circle( this.height>this.width?this.height/2:this.width/2, this.pos );
}

part.prototype.getEllipse = function()
{
  var radiusA = this.height/2;
  var radiusB = this.width/2;
  return new ellipse( radiusA, radiusB , this.pos, this.angle );
}

part.prototype.velocity = function ()
{
  if ( this.parentElement.pointVelocity )
    return this.parentElement.velocity();
  else
    return new vector( 0 , 0 );
}

part.prototype.angVelocity = function ()
{
  if ( this.parentElement.pointVelocity )
    return this.parentElement.angVelocity();
  else
    return 0;
}

part.prototype.pointVelocity = function( point, angVel )
{
  if ( this.parentElement.pointVelocity )
    return this.parentElement.pointVelocity( point, angVel );
  else
    return new vector( 0 , 0 );
}

element.prototype.momentInertia = function ()
{
  var sum = 0;
  for ( var i = 0 ; i < this.parts.length ; i++ )
    sum += this.parts[i].pos.modulus()*this.parts[i].pos.modulus() + this.parts[i].shape.areaInertia();	//parallel axes theorem centered in the element's axes
  return sum*this.mass;		//the density is assumed uniform
}

function element( id, coordinates )
{
  if ( !id ) return;
  ///GENERAL
  this.SVGNode = document.getElementById( id );
  this.id = id;
  this.type = this.SVGNode.getAttribute( 'element' );
  this.SVGNode.setAttribute( 'overflow' , 'visible' );

  ///WRAP EVERYTHING IN A GROUP
  this.group = document.createElementNS( 'http://www.w3.org/2000/svg', 'g' );
  this.group.setAttribute( 'id' , id + 'group' );

  while ( this.SVGNode.childNodes.length > 0 )
    this.group.appendChild( this.SVGNode.firstChild );
  this.SVGNode.appendChild( this.group );

  ///STATUS
  this.selected		= false;
  this.state	 	= 0;		//0 - stopped, 1 - moving
  this.animation 	= 0;

  this.orientation	= new vector( 0, -1 );				//the direction facing movement, not necessarily related to the angle of the object
  this.rotation		= undefined;					//the object describing the rotatory movement
  this.angle 		= Math.PI/180*parseFloat( this.SVGNode.getAttribute( 'rotation' ) ) || 0;	//the angle of rotation for the rendering transformation
  this.movementList	= [];

  //PARTS
  this.parts = [];
  var partsGNode = undefined;

    //look for the 'parts' group
    for ( var child = this.group.firstElementChild ; child != null ; child = child.nextElementSibling )
      if ( child.nodeName == 'g' && child.getAttribute( 'type' ) == 'parts' )
	partsGNode = child;
    //create the 'parts' elements
    if ( partsGNode )
    {
      for ( var child = partsGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
	this.parts.push( new part( child.getAttribute( 'id' ) , this ) );
    }
    else
      this.parts.push( new part( undefined, this ) );

    //divide convex polygons into simple concave polygon 'parts'
    for ( var i = 0 ; i < this.parts.length ; i++ )
      if ( this.parts[i].shape instanceof polygon && this.parts[i].shape.isConvex() )
      {
	var polyList = this.parts[i].shape.splitPolygon();			//split into a set of concave polygons
	for ( var k = 0 ; k < polyList.length ; k++ )				//add the new concave polygons (beginning)
	  this.parts.unshift( new part( undefined, this, polyList[k] ) );
	this.parts.splice( k, 1 );						//remove the convex polygon
	i = i + polyList.length - 1;						//index to start next iteration at 'same place'
      }

  ///DIMENSIONS
  var maxRight = -Infinity;
  var maxLeft  =  Infinity;
  var maxBottom= -Infinity;
  var maxTop   =  Infinity;
  for ( var i = 0 ; i < this.parts.length ; i++ )
  {
    var right = this.parts[i].pos.x + this.parts[i].width/2;
    var left  = this.parts[i].pos.x - this.parts[i].width/2;
    var bottom= this.parts[i].pos.y + this.parts[i].height/2;
    var top   = this.parts[i].pos.y - this.parts[i].height/2;
    if ( right > maxRight )
      maxRight = right;
    if ( left < maxLeft )
      maxLeft = left;
    if ( bottom > maxBottom )
      maxBottom = bottom;
    if ( top < maxTop )
      maxTop = top;
  }
  this.width  = maxRight - maxLeft;
  this.height = maxBottom - maxTop;

  ///LOCATION
  if ( coordinates )
    this.pos = new vector ( coordinates );
  else
  {
    var readX = this.SVGNode.getAttribute( 'x' );		//'SVG coords' are top-left corner
    var readY = this.SVGNode.getAttribute( 'y' );

    if ( readX && readY )
    {
      this.pos = new vector( parseFloat( readX ) + this.width/2, parseFloat( readY ) + this.height/2 );		//if the coordinates are explicitly set in the SVG document
      for ( var i = 0 ; i < this.parts.length ; i++ )
	this.parts[i].pos = this.parts[i].pos.minus( this.width/2, this.height/2 );//set part's positions relative to the element's central position
    }
    else
    {
      this.pos = new vector( maxLeft + this.width/2, maxTop + this.height/2 );	//otherwise, the position is defined by the parts, considered in global coordinates
      for ( var i = 0 ; i < this.parts.length ; i++ )
	this.parts[i].pos = this.parts[i].pos.minus( this.pos.x + this.width/2, this.pos.y + this.height/2 );//set part's positions relative to the element's central position
    }
  }
  //BOUNDING BOX
  this.BBox = new rectangle( this.width, this.height, this.pos, this.angle );
  this.BBox.currentAngle = 0;

  ///ATTRIBUTES
  this.mass = parseFloat( this.SVGNode.getAttribute( 'mass' ) ) || Infinity;
  this.momInertia = this.momentInertia();

  ///CONFIG
  var that = this;
  this.keyHandler = function( event ) { that.key( event ); };
  this.keyStopHandler = function ( event ){ that.keyStop( event ) };

  this.SVGNode.addEventListener( 'mousedown', function ( event ){ that.mouse( event ) }, false );
}

element.prototype.drawPosition = function ( newPos )
{
    if ( newPos instanceof vector )
      this.pos = newPos;

    this.SVGNode.setAttribute( 'x', this.pos.x - this.width/2  );
    this.SVGNode.setAttribute( 'y', this.pos.y - this.height/2 );
}

element.prototype.getPosition = function ()
{
  return new vector( this.pos );
}

element.prototype.rotate = function( angle )
{
  if ( angle == undefined )
    angle = 5*Math.PI/180;
  this.angle += angle;
  this.angle = angleCheck( this.angle );
}

function getShape()		//updates the information of the element's bounding box and returns it. The box is never rotated, it just adjusts its dimensions
{
  this.BBox.pos = this.pos;
  if ( this.angle && this.BBox.currentAngle != this.angle )	//if there has been rotation in this frame
  {
    //ADJUSTMENT OF THE BOUNDING BOX ON ROTATION, as the not-rotated b.box that contains the original b.box rotated
    this.BBox.currentAngle = this.angle;	//rotation angle for which it is adapted currently
    var sinA = Math.sin( this.angle );
    var cosA = Math.cos( this.angle );

    if ( this.angle >= 0 && this.angle <= Math.PI/2 )
    {
      this.BBox.width  = this.height*sinA + this.width *cosA;
      this.BBox.height = this.width *sinA + this.height*cosA;
    }
    else if ( this.angle > Math.PI/2 )
    {
      this.BBox.width  = -this.width *cosA + this.height*sinA;
      this.BBox.height = -this.height*cosA + this.width *sinA;
    }
    else if ( this.angle < 0 && this.angle >= -Math.PI/2 )
    {
      this.BBox.width  = -this.height*sinA + this.width *cosA;
      this.BBox.height = -this.width *sinA + this.height*cosA;
    }
    else// if ( this.angle < -Math.PI/2 )
    {
      this.BBox.width  = -this.width *cosA - this.height*sinA;
      this.BBox.height = -this.height*cosA - this.width *sinA;
    }
  }
  return this.BBox;
}
element.prototype.getShape = getShape;
sceneItem.prototype.getShape = getShape;

element.prototype.drawRotation = function( angle )
{
  if ( angle != undefined )
    this.angle = angle;
  this.group.setAttribute( 'transform', 'rotate( ' + this.angle*180/Math.PI + ',' + this.width/2 + ',' + this.height/2 + ')' );
}

element.prototype.velocity = function ()
{
    if ( this.movementList[0] )
      return this.movementList[0].velocity();
    else
      return new vector( 0, 0 );
}

element.prototype.angVelocity = function ()
{
    if ( this.rotation )
      return this.rotation.angVelocity;
    else
      return 0;
}

element.prototype.pointVelocity = function( point, angVel )
//returns the velocity component of a given point due to rotation.(Assumed attached to the object)
{
    var d	= point.minus(  this.pos );
    var ang	= d.angle();
    var result	= new vector( -Math.sin( ang ), Math.cos( ang ) );
    angVel	= angVel || this.angVelocity();

    return result.multiply( d.modulus() * angVel );
}

element.prototype.setState = function ( newState, newAnimation )
{
  this.state = newState || 0;				//0 - stopped , 1 - moving
  switch ( this.state )
  {
    case 1 :
      this.animation = newAnimation || 1;
      break;
    default :
      this.animation = newAnimation || 0;
      this.cancelMovements();
  }
  if ( newAnimation )
    this.animation = animation;
}

element.prototype.setSelected = function( selected )
{
  if ( selected == undefined )
      selected = true;

  if ( selected && !this.selected )		//here it goes, some closure madness xDDDDD
  {
      document.addEventListener( 'keydown', this.keyHandler, false );
      document.addEventListener( 'keyup', this.keyStopHandler, false );
      this.selected = true;
      selectedList.push( this );
  }
  if ( !selected && this.selected )
  {
      document.removeEventListener( 'keydown', this.keyHandler, false );
      document.removeEventListener( 'keyup', this.keyStopHandler, false );
      for ( var i = 0 ; i < selectedList.length ; i++ )
	if ( this === selectedList[i] )
	{
	  selectedList.splice( i, 1 );
	  i = selectedList.length;
	}
      this.selected = false;
  }
  scene.unfollow();
  scene.setMaxZoom();
}

element.prototype.toggleSelected = function()
{
      if ( this.selected )
	this.setSelected( false );
      else
	this.setSelected( true );
}

function selectElements( option, list )
{
  list = list || elementList;
  if ( option == undefined )
    option = true;
  for ( var i = 0 ; i < list.length ; i++ )
      list[i].setSelected( option );
}

element.prototype.addMovement = function( newMovement )
{
    if ( newMovement && newMovement instanceof movement )
    {
      this.movementList.push( newMovement );
      this.setState( 1 );	//1 - moving state
    }
}

element.prototype.replaceMovement = function( newMovement )
{
     if ( this.movementList[0] )
      this.movementList[0].replace = true;
     this.addMovement( newMovement );
}

element.prototype.doReplaceMovement = function()
{
      var newMovement = this.movementList[ this.movementList.length - 1 ];
      this.movementList = [];
      this.addMovement( newMovement );
      this.setState( 1 );	//1 - moving state
}

element.prototype.finishMovement = function()
{
  if ( this.movementList.length > 0 )
  {
    var lastSpeed = this.movementList[0].speed;
    var state = this.movementList[0].state;
    this.movementList.shift();
    if ( this.movementList[0] )
    {
      this.movementList[0].setSpeed( lastSpeed );
      this.movementList[0].state = state;
    }
  }
}

element.prototype.cancelMovements = function()
{
  if ( this.movementList[0] )
    this.movementList[0].cancel = true;
}

element.prototype.moveTo = function ( destPos, append, curved )		///convenience function to make the element move towards a position, and chain movements
{
    if ( append == undefined )
      append = false;
    if ( curved == undefined )
      curved = false;

    if ( !append || this.movementList.length == 0 )
    {
      if( !curved )
	this.replaceMovement( new softMovement  ( this.pos, destPos ) );
      else
	this.replaceMovement( new curvedMovement( this.pos, destPos ) );
    }
    else
    {
      if ( this.movementList[ this.movementList.length-1 ] instanceof softMovement )
	this.movementList[ this.movementList.length-1 ].cancelLand();
      if( !curved )
	this.addMovement( new softMovement( this.movementList[ this.movementList.length-1 ].destPosition, destPos ) );
      else
	this.addMovement( new curvedMovement( this.movementList[ this.movementList.length-1 ].destPosition, destPos ) );
    }
}

element.prototype.move = function ( newMove )  			//position update for each frame
{
    //ELEMENT TRANSLATIONS
    if ( newMove instanceof movement )
      this.addMovement( newMove );				//add a new movement to the element, provided for convenience
    else if ( this.movementList[0] )
    {
      if ( this.movementList[0].cancel )
      {
	this.orientation = new vector ( this.movementList[0].direction );
	this.movementList = [];
      }
      else
      {
	if ( this.movementList[0].replace )
	  this.doReplaceMovement();
	if ( this.movementList[0].isFinished() )
	  this.finishMovement();
	else
	  this.pos = this.pos.add( this.movementList[0].advance() );
      }
    }
    //ELEMENT ROTATIONS
    if ( this.movementList[0] && this.movementList[0].oriented )
    {
      var angle = this.movementList[0].direction.angle() - Math.PI/2;
      if ( this.angle != angle )
      {
	this.orientation = new vector ( this.movementList[0].direction );
	this.drawRotation( angle );
      }
    }
    else if ( this.rotation )
    {
      var increment = this.rotation.advance();
      this.orientation.rotate( increment );
      this.rotate( increment );
      if ( this.rotation.isFinished() )
	this.rotation = undefined;
    }
}

element.prototype.chase = function ( targetObj, accelerating, speed )
{
  if ( targetObj instanceof element && targetObj !== this )
    this.replaceMovement( new chaseMovement( this, targetObj, speed ) );
}

element.prototype.hits = function( checkPoint, radius )		///check if the element hits a point
{
    var result = false;
    if ( checkPoint && checkPoint instanceof vector )
    {
	radius = radius || 10;
	var increment = this.pos.minus( checkPoint );
	if ( increment.modulus() <= radius )
	  result = true;
    }
    return result;
}

element.prototype.mouse = function( event )
{
  event.preventDefault();
  event.stopPropagation();
  if ( event.ctrlKey )		//TOGGLE SELECTION
  {
    if ( !( selectedList.length == 1 && selectedList[0] === this ) )	//don't de-select the last one
      this.toggleSelected();
  }
  else if( event.shiftKey )	//SELECT ALL
    selectElements();
  else				//SELECT ONLY THIS ELEMENT
  {
    selectElements( false );
    this.setSelected();
  }
}

element.prototype.key = function( event )
{
  if ( event.keyCode == 27 ) ///'esc' CANCEL MOVEMENTS
    this.cancelMovements();

  if ( event.keyCode == 84 ) ///'t' FORWARDS
      this.replaceMovement( new movement( this.orientation ) );
  if ( event.keyCode == 71 ) ///'g' BACKWARDS
  {
      this.replaceMovement( new movement( this.orientation.multiply( -1 ) ) );
      this.orientation = this.orientation.multiply( -1 );
  }
    ////////////
  if ( event.keyCode == 87 ) ///'w' UP
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
      this.movementList[0].addDir( 'up' );
    else
      this.replaceMovement( new arrowMovement( 'up' ) );
  }
  else if ( event.keyCode == 83 ) ///'s' DOWN
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
      this.movementList[0].addDir( 'down' );
    else
      this.replaceMovement( new arrowMovement( 'down' ) );
  }
  if ( event.keyCode == 68 ) ///'d' RIGHT
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
      this.movementList[0].addDir( 'right' );
    else
      this.replaceMovement( new arrowMovement( 'right' ) );
  }
  else if ( event.keyCode == 65 ) ///'a' LEFT
  {
    if ( this.movementList[0] && this.movementList[0] instanceof arrowMovement )
      this.movementList[0].addDir( 'left' );
    else
      this.replaceMovement( new arrowMovement( 'left' ) );
  }
  ///////////////////////////////////////////////////////////////

  if ( event.keyCode == 73 ) ///'i' ACCELERATE AND BEGIN 'CAR MODE'
  {
    if ( !this.movementList[0] )
      this.addMovement( new carMovement( this.orientation ) );
    this.movementList[0].accelState = 1;
  }
  if ( event.keyCode == 75 ) ///'k' DECCELERATE
  {
    if ( this.movementList[0] )
	this.movementList[0].accelState = 2;
  }
  if ( event.keyCode == 76 || event.keyCode == 72 ) ///'l' STIR RIGHT
  {
    if ( this.movementList[0] instanceof carMovement )
      this.movementList[0].steerState = 1;
    this.rotation = new rotation( shiftAngle );
  }
  if ( event.keyCode == 74 || event.keyCode == 70  ) ///'j' STIR LEFT
  {
    if ( this.movementList[0] && this.movementList[0] instanceof carMovement )
      this.movementList[0].steerState = 2;
    this.rotation = new rotation( -shiftAngle );
  }
  if ( event.keyCode == 13 )	///'enter' CHASE
  {
    this.chase( elementList[0] );
  }
  if ( event.keyCode == 32 )	///'space' GO RANDOM
  {
    if ( !this.movementList[0] )
      this.addMovement( new movement( this.orientation ) );
// 	this.movementList[0].randomSpeed();
    this.movementList[0].randomCurv();
    //this.movementList[0].randomOrient();
  }
  if ( event.keyCode == 67 )	///'c' ADD CIRCLE COMPONENT
  {
    if ( !this.movementList[0] )
      this.addMovement( new circleMovement() );
    else
      this.movementList[0].components.push( new circleMovement() );
  }
  if ( event.keyCode == 90 )	///'z' FOCUS ELEMENT IN SCREEN VIEW
    scene.focus( this );

  if ( event.keyCode == 88 )	///'x' TOGGLE 'FOLLOW ELEMENT WITH CAMERA', CENTERED WITH 'CTRL'
  {
    if ( scene.followedObj !== this )
      scene.follow( this, event.ctrlKey );
    else
      scene.unfollow();
  }
    if ( event.keyCode == 8 ) //'backspace' SPIN (ACCELERATE). COUNTER CLOCKWISE WITH 'SHIFT' (DECCELERATE)
    {
      if ( !event.shiftKey )
      {
	if ( this.rotation )
	  this.rotation.accelerate( shiftAngle );
	else
	  this.rotation = new rotation( 3*shiftAngle , 0.005 );
      }
      else
      {
	if ( this.rotation )
	  this.rotation.accelerate( -shiftAngle );
	else
	  this.rotation = new rotation( -3*shiftAngle , 0.005 );
      }
    }
}

element.prototype.keyStop = function( event )
{
     if ( event.keyCode == 84 || event.keyCode == 71 )
      this.setState ( 0 );		//0 - stopped state
    if ( this.movementList[0] )
    {
      if ( event.keyCode == 87 && this.movementList[0] instanceof arrowMovement  )
	this.movementList[0].addDir( 'up', false );
      if ( event.keyCode == 83 && this.movementList[0] instanceof arrowMovement  )
	this.movementList[0].addDir( 'down', false );
      if ( event.keyCode == 68 && this.movementList[0] instanceof arrowMovement  )
	this.movementList[0].addDir( 'right', false );
      if ( event.keyCode == 65 && this.movementList[0] instanceof arrowMovement  )
	this.movementList[0].addDir( 'left', false );
      if ( event.keyCode == 73 || event.keyCode == 75 )
	this.movementList[0].accelState = 0;
      if (  event.keyCode == 74 || event.keyCode == 76  )
	this.movementList[0].steerState = 0;
    }
    if (  event.keyCode == 74  || event.keyCode == 76  || event.keyCode == 70  || event.keyCode == 72 )
      this.rotation = undefined;
}

function character( id, coordinates )          /// Character constructor, from SVG element with id 'id' in SVG DOM tree.
{
  element.call( this, id, coordinates );

  this.lArm = document.getElementById( id + 'leftarm' );
  this.rArm = document.getElementById( id + 'rightarm');
  this.lLeg = document.getElementById( id + 'leftleg' );
  this.rLeg = document.getElementById( id + 'rightleg');
  this.head = document.getElementById( id + 'head'    );

  this.lArmAxis = new vector( this.lArm.getAttribute( 'lArmAxisX' )-0 , this.lArm.getAttribute( 'lArmAxisY' )-0 	);
  this.rArmAxis = new vector( this.rArm.getAttribute( 'rArmAxisX' )-0 , this.rArm.getAttribute( 'rArmAxisY' )-0 	);
  this.headAxis = new vector( this.head.getAttribute( 'headX' )-0     , this.head.getAttribute( 'headY' )-0 	);

  this.lAngleArm = 0;
  this.rAngleArm = 0;
  this.headAngle = 0;
  this.lLegStretch = 1;
  this.rLegStretch = 1;

  this.headFlag = true;
  this.lArmFlag = true;
  this.rArmFlag = true;
  this.lLegFlag = true;
  this.rLegFlag = true;

  this.headRange = 2;
  this.StretchRange = 0.02;
}

character.prototype = new element();		//new objects created with 'new' and this function will have this obj as their prototype to look up to
character.prototype.constructor = character;    //we want to state that the constructor of 'character' objects is character(), not element()

character.prototype.animate = function ( animate )    ///Performs 'animation', or the animation corresponding to the current state if no parameters
{
    if ( animate )
      this.animation = animate;
    if ( this.animation == 1 )		//moving
    {
      if ( this.lAngleArm <= -115 )
	this.lArmFlag = false;
      if ( this.lArmFlag )
	this.lAngleArm -= 115/photogramsPerCycle;
      else
	this.lAngleArm += 115/photogramsPerCycle;
      if ( this.lAngleArm >= 0 )
	this.lArmFlag = true;
      //////////////////////////////////////////
      if ( this.rAngleArm >= 120 )
	this.rArmFlag = false;
      if ( this.rArmFlag )
	this.rAngleArm += 120/photogramsPerCycle;
      else
	this.rAngleArm -= 120/photogramsPerCycle;
      if ( this.rAngleArm <= 0 )
	this.rArmFlag = true;
      //////////////////////////////////////////
      if ( this.lLegStretch <= 1 - this.StretchRange )
	this.lLegFlag = false;
      if ( this.lLegFlag )
	this.lLegStretch -= 0.01;
      else
	this.lLegStretch += 0.01;
      if ( this.lLegStretch >= 1 + this.StretchRange )
	this.lLegFlag = true;
      ////////////////////////////////////////
      if ( this.rLegStretch <= 1 - this.StretchRange )
	this.rLegFlag = true;
      if ( this.rLegFlag )
	this.rLegStretch += 0.01;
      else
	this.rLegStretch -= 0.01;
      if ( this.rLegStretch >= 1 + this.StretchRange )
	this.rLegFlag = false;


      this.lArm.setAttribute( 'transform', 'rotate( ' + this.lAngleArm + ' ,'+this.lArmAxis.x+', '+ this.lArmAxis.y +')' );
      this.rArm.setAttribute( 'transform', 'rotate( ' + this.rAngleArm + ' ,'+this.rArmAxis.x+', '+ this.rArmAxis.y +')' );
      this.lLeg.setAttribute( 'transform', ' scale(1,'+ this.lLegStretch +')' );
      this.rLeg.setAttribute( 'transform', ' scale(1,'+ this.rLegStretch +')' );
    }
    /////////////////////////////////////////
    if ( this.animation == 0 )	//stopped
    {
      if ( this.headAngle > this.headRange )
	this.headFlag = false;
      if ( this.headFlag )
	this.headAngle += 5*this.headRange/photogramsPerCycle;
      else
	this.headAngle -= 5*this.headRange/photogramsPerCycle;
      if ( this.headAngle < -this.headRange )
	this.headFlag = true;

      this.head.setAttribute( 'transform', 'rotate( ' + this.headAngle + ' ,'+ this.headAxis.x + ', ' + this.headAxis.y +')' );
    }
}
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

function keyDown( event )
{
  event.preventDefault();
  if ( event.keyCode == 49 ) //'1'
  {
    selectElements( false );
    if ( elementList[0] )
    {
      elementList[0].setSelected( true );
      scene.focus( elementList[0] );
    }
  }
  if ( event.keyCode == 50 ) //'2'
  {
    selectElements( false );
    if ( elementList[1] )
    {
      elementList[1].setSelected( true );
      scene.focus( elementList[1] );
    }
  }
  if ( event.keyCode == 51 ) //'3'
  {
    selectElements( false );
    if ( elementList[2] )
    {
      elementList[2].setSelected( true );
      scene.focus( elementList[2] );
    }
  }
  if ( event.keyCode == 52 ) //'4'
  {
    selectElements( false );
    if ( elementList[3] )
    {
      elementList[3].setSelected( true );
      scene.focus( elementList[3] );
    }
  }
  if ( event.keyCode == 53 ) //'5'
  {
    selectElements( false );
    if ( elementList[4] )
    {
      elementList[4].setSelected( true );
      scene.focus( elementList[4] );
    }
  }
  if ( event.keyCode == 54 ) //'6'
  {
    selectElements( false );
    if ( elementList[5] )
    {
      elementList[5].setSelected( true );
      scene.focus( elementList[5] );
    }
  }
  if ( event.keyCode == 55 ) //'7'
  {
    selectElements( false );
    if ( elementList[6] )
    {
      elementList[6].setSelected( true );
      scene.focus( elementList[6] );
    }
  }
  if ( event.keyCode == 56 ) //'8'
  {
    selectElements( false );
    if ( elementList[7] )
    {
      elementList[7].setSelected( true );
      scene.focus( elementList[7] );
    }
  }
  if ( event.keyCode == 57 ) //'9'
  {
    selectElements( false );
    if ( elementList[8] )
    {
      elementList[8].setSelected( true );
      scene.focus( elementList[8] );
    }
  }
  if ( event.keyCode == 48 ) //'0'
    selectElements( true );
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////*************************************************************************************************************\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function sceneItem( id )		//Non only decorative item that is part of the scenery, defined by one or more different 'parts'
{
  if ( !id ) return;
  this.SVGNode = document.getElementById( id );
  this.id = id;
  this.type = this.SVGNode.getAttribute( 'type' ) || 'solid';		//describes the 'role' of the item in with element's interaction

  //PARTS
  this.parts = [];

  if ( this.SVGNode.nodeName == 'g' )
  {
    for ( var child = this.SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
      if ( child.nodeName == 'rect' || child.nodeName == 'circle' || child.nodeName == 'ellipse' || child.nodeName == 'path' )
	this.parts.push( new part( child.getAttribute( 'id' ) , this ) );
  }
  else
    this.parts.push( new part( this.SVGNode.id , this ) );

    //divide convex polygons into simple concave polygon 'parts'
    for ( var i = 0 ; i < this.parts.length ; i++ )
      if ( this.parts[i].shape instanceof polygon && this.parts[i].shape.isConvex() )
      {
	var polyList = this.parts[i].shape.splitPolygon();			//split into a set of concave polygons
	for ( var k = 0 ; k < polyList.length ; k++ )				//add the new concave polygons (beginning)
	  this.parts.unshift( new part( undefined, this, polyList[k] ) );
	this.parts.splice( k, 1 );						//remove the convex polygon
	i = i + polyList.length - 1;						//index to start next iteration at 'same place'
      }

  ///DIMENSIONS
  var maxRight = -Infinity;
  var maxLeft  =  Infinity;
  var maxBottom= -Infinity;
  var maxTop   =  Infinity;
  for ( var i = 0 ; i < this.parts.length ; i++ )
  {
    var right = this.parts[i].pos.x + this.parts[i].width/2;
    var left  = this.parts[i].pos.x - this.parts[i].width/2;
    var bottom= this.parts[i].pos.y + this.parts[i].height/2;
    var top   = this.parts[i].pos.y - this.parts[i].height/2;
    if ( right > maxRight )
      maxRight = right;
    if ( left < maxLeft )
      maxLeft = left;
    if ( bottom > maxBottom )
      maxBottom = bottom;
    if ( top < maxTop )
      maxTop = top;
  }
  this.width  = maxRight - maxLeft;
  this.height = maxBottom - maxTop;

  ///LOCATION
  var readX = parseFloat( this.SVGNode.getAttribute( 'x' ) ) || maxLeft;		//'SVG coords' are top-left corners
  var readY = parseFloat( this.SVGNode.getAttribute( 'y' ) ) || maxTop ;
  this.pos = new vector( readX + this.width/2, readY + this.height/2 );			//center of the object
  this.BBox = new rectangle( this.width, this.height, this.pos );
  this.BBox.currentAngle = 0;

  //set part's positions relative to the element position
  for ( var i = 0 ; i < this.parts.length ; i++ )
    this.parts[i].pos = this.parts[i].pos.minus( this.pos );
}

function map( id, viewBoxCoords, viewBoxSizeX, viewBoxSizeY ) ///coordinates are CENTER of the view box
{
  if ( !id ) return;
  this.SVGNode = document.getElementById( id );
  this.worldSVGNode = this.SVGNode.parentNode;		//the 'map'SVG receives events and its parent manages zoom,pan.. because the parent contains all the elements
  this.id = id;
  this.type = this.SVGNode.getAttribute( 'map' );
  this.worldSVGNode.setAttribute( 'x', 0 );
  this.worldSVGNode.setAttribute( 'y', 0 );
  this.worldSVGNode.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );  ///keep aspect ratio when stretching
  this.worldSVGNode.setAttribute( 'overflow' , 'visible' );

  //INITIALIZE ALL SOLID ELEMENTS
  var sceneItemsGNode = undefined;
  this.sceneItems = [];
  for ( var child = this.SVGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
    if ( child.nodeName == 'g' && child.getAttribute( 'id' ) == 'sceneItems' )
      sceneItemsGNode = child;
  if ( sceneItemsGNode )
    for ( var child = sceneItemsGNode.firstElementChild ; child != null ; child = child.nextElementSibling )
      this.sceneItems.push( new sceneItem( child.getAttribute( 'id' ) ) );

  //CAMERA PARAMETERS
  this.zoomFactor = 0.95;
  this.zoomState = 0;
  this.panRightLeft = 0;
  this.panUpDown = 0;
  this.followedObj = undefined;
  this.centerObj = false;
  this.mousePan = false;
  this.maxZoom = 10;

  //MAP PARAMETERS

  this.mapSizeX = this.worldSVGNode.getAttribute( 'width' )-0;			///Get the original dimensions, these are PROPORTIONAL to the REAL drawing.
  this.mapSizeY = this.worldSVGNode.getAttribute( 'height' )-0;			///Use these for boundary checks.

  if ( !this.mapSizeX || this.mapSizeX == '100%' )				///Just in case, but the boundary checks won't work properly if these dimensions
    this.mapSizeX = window.innerWidth;					///are not set from the SVG document
  if ( !this.mapSizeY || this.mapSizeY == '100%' )
    this.mapSizeY = window.innerHeight;

  this.worldSVGNode.setAttribute( 'width', window.innerWidth );			///Adjust the drawing to the screen.
  this.worldSVGNode.setAttribute( 'height',window.innerHeight );			///One of these dimensions will NOT be proportional to the drawing.

  ///SET THE INITIAL VIEW BOX
  if ( viewBoxCoords && viewBoxSizeX  )
  {
    this.viewBoxWidth = viewBoxSizeX;
    if ( !viewBoxSizeY )
      this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
    else
    {
      this.viewBoxHeight = viewBoxSizeY;
      this.adjustViewBox();
    }
    this.scroll = viewBoxCoords;
  }
  else
  {
    var params = this.worldSVGNode.getAttribute( 'viewBox' );
    if ( params )
    {
      params = params.split(' ');
      this.viewBoxWidth = params[2]-0;
      this.viewBoxHeight = params[3]-0;
      this.adjustViewBox();
      this.scroll = new vector ( params[0] + this.viewBoxWidth/2, params[1] + this.viewBoxHeight/2 ) ;
    }
    else
    {
      this.viewBoxWidth  = this.mapSizeX;
      this.viewBoxHeight = this.mapSizeY;
      this.adjustViewBox();
      this.scroll = new vector( this.viewBoxWidth/2, this.viewBoxHeight/2 );
    }
  }
  this.setViewBox();

  ///SET EVENTS
  var that = this;
  this.keyHandler 	 = function ( event ){ that.keyDown( event ) 	};
  this.keyStopHandler 	 = function ( event ){ that.keyStop( event ) 	};
  this.mouseDownHandler  = function ( event ){ that.mouseDown( event ) 	};
  this.mouseClickHandler = function ( event ){ that.mouseClick( event ) };
  this.wheelHandler	 = function ( event ){ that.wheel( event ) 	};


  document.addEventListener	( 'keydown',		this.keyHandler , 	false );
  document.addEventListener	( 'keyup', 		this.keyStopHandler, 	false );
  this.SVGNode.addEventListener	( 'mousedown',		this.mouseDownHandler, 	false );
  this.SVGNode.addEventListener	( 'click',		this.mouseClickHandler ,false );
  this.SVGNode.addEventListener	( 'DOMMouseScroll',	this.wheelHandler,	false );
}

map.prototype.adjustViewBox = function ()
{
    ///Make viewBox no bigger than map and no smaller than maxZoom
    if ( this.viewBoxHeight >= this.viewBoxWidth && this.viewBoxWidth <= this.maxZoom )
	this.viewBoxWidth = this.maxZoom;

    else if ( this.viewBoxHeight < this.viewBoxWidth && this.viewBoxHeight <= this.maxZoom )
	this.viewBoxHeight = this.maxZoom;

    if ( this.viewBoxHeight <= this.viewBoxWidth && this.viewBoxWidth > this.mapSizeX )
	this.viewBoxWidth = this.mapSizeX;
    if ( this.viewBoxHeight > this.viewBoxWidth && this.viewBoxHeight > this.mapSizeY )
	this.viewBoxHeight = this.mapSizeY;

    ///Adjusts viewBox proportionally to the screen
    if  ( ( this.viewBoxWidth/this.viewBoxHeight > 1 &&  window.innerWidth/window.innerHeight < 1 ) ||
      ( this.viewBoxWidth/this.viewBoxHeight > window.innerWidth/window.innerHeight &&
      ( ( this.viewBoxWidth/this.viewBoxHeight > 1 &&  window.innerWidth/window.innerHeight > 1 ) ||
      ( this.viewBoxWidth/this.viewBoxHeight < 1 &&  window.innerWidth/window.innerHeight < 1 ) ) ) )
    {
      this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
    }
    else
      this.viewBoxWidth  = this.viewBoxHeight*window.innerWidth/window.innerHeight;
}

map.prototype.setViewBox = function ( newPoint, newWidth, newHeight )			 //Set viewBox according to inner variables or input parameters.
{
    if ( newWidth )
    {
      this.viewBoxWidth = newWidth;
      if ( newHeight )
	this.viewBoxHeight = newHeight;
      else
	this.viewBoxHeight = this.viewBoxWidth*window.innerHeight/window.innerWidth;
    }
    if ( newPoint )
      this.scroll = new vector( newPoint.x, newPoint.y );

    this.adjustViewBox();
    this.adjustScroll();
    this.worldSVGNode.setAttribute( 'viewBox',
				  ( this.scroll.x -this.viewBoxWidth/2 ) +' '+
				  ( this.scroll.y -this.viewBoxHeight/2 ) +' '+
				    this.viewBoxWidth +' '+ this.viewBoxHeight );
}

map.prototype.adjustScroll = function () 				 ///adjusts scrolls so that the camera does not go out of the map
{
  if ( this.scroll.x + this.viewBoxWidth/2 > this.mapSizeX )
    this.scroll.x = this.mapSizeX  - this.viewBoxWidth/2;
  if ( this.scroll.y + this.viewBoxHeight/2 > this.mapSizeY )
    this.scroll.y = this.mapSizeY - this.viewBoxHeight/2;

  if ( this.scroll.x < this.viewBoxWidth/2 )
    this.scroll.x = this.viewBoxWidth/2;
  if ( this.scroll.y < this.viewBoxHeight/2 )
    this.scroll.y = this.viewBoxHeight/2;
}

map.prototype.fromScreen = function( screenCoords )
{
  var x =  screenCoords.x*this.viewBoxWidth/window.innerWidth + this.scroll.x - this.viewBoxWidth/2 ;
  var y =  screenCoords.y*this.viewBoxHeight/window.innerHeight + this.scroll.y - this.viewBoxHeight/2 ;
  return ( new vector( x, y ) );
}

map.prototype.zoomIn = function( pos, zoomFactor )
{
  zoomFactor = zoomFactor || this.zoomFactor;

  if ( this.viewBoxWidth > this.maxZoom && this.viewBoxHeight > this.maxZoom )
  {
    this.viewBoxWidth  *= zoomFactor;
    this.viewBoxHeight *= zoomFactor;

    if ( pos instanceof vector )
      this.scroll = new vector( pos );
    else if ( this.followedObj instanceof element )
      this.scroll = new vector( this.followedObj.pos );

      this.setViewBox();
  }
}

map.prototype.zoomOut = function( pos, zoomFactor )
{
  zoomFactor = zoomFactor || this.zoomFactor;
  if ( this.viewBoxWidth < this.mapSizeX || this.viewBoxHeight < this.mapSizeY )
  {
    this.viewBoxWidth /= zoomFactor;
    this.viewBoxHeight /= zoomFactor;

    if ( pos instanceof vector )
      this.scroll = new vector( pos );
    else if ( this.followedObj instanceof element )
      this.scroll = new vector( this.followedObj.pos );

    this.setViewBox();
  }
}

map.prototype.zoom = function ( newPoint, newSizeX, newSizeY )	///set camera to this position if parameters, perform zoomState otherwise.
{
  if( newPoint )
    this.setViewBox( newPoint, newSizeX, newSizeY );
  else if ( this.zoomState == 1 )
    this.zoomIn();
  else if ( this.zoomState == 2 )
    this.zoomOut();
}

map.prototype.setMaxZoom = function ( object ) ///sets max zoom to 1.5x the size of the input object, or the biggest selected element, (or to a number)
{
    if ( typeof object == "number" )
      this.maxZoom = object;
    else
    {
      var list = [];

      if ( object instanceof element )
	list = new Array( object );
      else
	list = selectedList;

      if ( list.length > 0 )
	this.maxZoom = 0;

      for ( var i = 0 ; i < list.length ; i++ )
      {
	if ( list[i].height >= list[i].width && list[i].height*3/2 > this.maxZoom )
	    this.maxZoom = list[i].height*3/2;
	else if ( list[i].width > list[i].height && list[i].width*3/2 > this.maxZoom )
	    this.maxZoom = list[i].width*3/2;
      }
    }
    this.adjustZoom();
}

map.prototype.adjustZoom = function()	///adjusts if the current zoom is too big
{
    if ( this.viewBoxWidth < this.maxZoom )
      this.viewBoxWidth  = this.maxZoom;
    if ( this.viewBoxHeight < this.maxZoom )
      this.viewBoxHeight = this.maxZoom;
    if ( this.viewBoxWidth == this.maxZoom || this.viewBoxHeight == this.maxZoom )
      this.setViewBox();
}

map.prototype.focus = function ( object, level )
{
  var level = level || 5;
  this.setViewBox( object.pos, object.width*level, object.height*level );
}

map.prototype.pan = function( dirX, dirY )
{
  if ( !this.followedObj )
  {
    dirX =  dirX || this.panRightLeft;
    dirY =  dirY || this.panUpDown;

    if ( dirY == 'down' )
      this.scroll.y += this.viewBoxHeight/panSteps;
    else if ( dirY == 'up' )
      this.scroll.y -= this.viewBoxHeight/panSteps;

    if ( dirX == 'right' )
      this.scroll.x += this.viewBoxWidth/panSteps;
    else if ( dirX == 'left' )
      this.scroll.x -= this.viewBoxWidth/panSteps;
  }
  else
    this.follow();
  this.setViewBox();
}

map.prototype.follow = function ( object, centered )			///set followed object and if the camera is centered, and/or perform the tracking.
{
    ///SET THE FOLLOWING PARAMETERS
    if ( centered != undefined )
      this.centerObj = centered;
    if ( object instanceof element )
      this.followedObj = object;

    else if ( this.followedObj )
    {
      ///ADJUST SCROLL
      if ( !this.centerObj )
      {
	var marginX = (this.viewBoxWidth - this.followedObj.width)/4.0;
	var marginY = (this.viewBoxHeight- this.followedObj.height)/4.0;

	if ( this.followedObj.pos.x + this.followedObj.width/2 + marginX > this.scroll.x + this.viewBoxWidth/2 )
	  this.scroll.x = this.followedObj.pos.x + this.followedObj.width/2 + marginX - this.viewBoxWidth/2;

	if ( this.followedObj.pos.x - this.followedObj.width/2 - marginX < this.scroll.x - this.viewBoxWidth/2 )
	  this.scroll.x = this.followedObj.pos.x - this.followedObj.width/2 - marginX + this.viewBoxWidth/2;

	if ( this.followedObj.pos.y + this.followedObj.height/2 + marginY > this.scroll.y + this.viewBoxHeight/2 )
	  this.scroll.y = this.followedObj.pos.y + this.followedObj.height/2 + marginY - this.viewBoxHeight/2;

	if ( this.followedObj.pos.y - this.followedObj.height/2 - marginY < this.scroll.y - this.viewBoxHeight/2 )
	  this.scroll.y = this.followedObj.pos.y - this.followedObj.height/2 - marginY + this.viewBoxHeight/2;
      }
      else
      {
	if ( this.followedObj.pos.x != this.scroll.x )
	  this.scroll.x = this.followedObj.pos.x;

	if ( this.followedObj.pos.y != this.scroll.y )
	  this.scroll.y = this.followedObj.pos.y;
      }
      this.adjustZoom();
      this.adjustScroll();
  }
}

map.prototype.unfollow = function ()
{
  this.followedObj = undefined
}

map.prototype.keyDown = function ( event )
{
  if ( event.keyCode == 40 && this.scroll.y + this.viewBoxHeight/2 <= this.mapSizeY )         ///down
    this.panUpDown = 2;
  if ( event.keyCode == 38 && this.scroll.y >= this.viewBoxHeight/2		) ///up
    this.panUpDown = 1;
  if ( event.keyCode == 39 && this.scroll.x + this.viewBoxWidth/2<= this.mapSizeX ) 	  ///right
    this.panRightLeft = 1;
  if ( event.keyCode == 37 && this.scroll.x >= this.viewBoxWidth/2		) ///left
    this.panRightLeft = 2;

  if ( event.keyCode == 34 )		 ///PG_DOWN ZOOM IN
    this.zoomState = 1;
  if ( event.keyCode == 33 )		 ///PG_UP ZOOM OUT
    this.zoomState = 2;
}

map.prototype.keyStop = function ( event )
{
    if ( event.keyCode == 33 || event.keyCode == 34 )
      this.zoomState = 0;
    if ( event.keyCode == 38 || event.keyCode == 40 )
      this.panUpDown = 0;
    if ( event.keyCode == 37 || event.keyCode == 39 )
      this.panRightLeft = 0;
}

map.prototype.mouseClick = function ( event )
{
  event.preventDefault();
  event.stopPropagation();
  var screenCoords = new vector( event.clientX, event.clientY );

  if ( event.button == '0' ) //left button
    for ( var i = 0 ; i < elementList.length ; i++ )
      if ( elementList[i].selected )
	elementList[i].moveTo( this.fromScreen( screenCoords ) , event.shiftKey, event.ctrlKey );
}

map.prototype.mouseDown = function ( event )
{
  event.preventDefault();
  event.stopPropagation();
  var screenCoords = new vector( event.clientX, event.clientY );

  if ( event.button == '0' ) //left button - selection box
    if ( !selectBox.active )
      selectBox.beginDraw( screenCoords.x, screenCoords.y );

  if ( event.button == '2' ) //right button - center camera in position
    this.zoom( this.fromScreen( screenCoords ) );

  if ( event.button == '1' ) //middle button - toggle mouse pan mode
    {
      if ( !this.mousePan )
      {
	this.mousePan = true;
	var that = this;
	this.mouseHandler = function( event ) { that.mouseMove( event ); }
	document.addEventListener( 'mousemove', this.mouseHandler, false );
      }
      else
      {
	this.mousePan = false;
	this.mouseHandler = undefined;
	document.removeEventListener( 'mousemove', this.mouseHandler, false );
      }
  }
}

function mouseUp ( event )
{
  event.preventDefault();
  event.stopPropagation();
  if ( event.button == '0' ) //left button
  {
    selectBox.unDraw();
    //BOX-SELECT, if dragging has occured
    if ( selectBox.width != 0 && selectBox.height != 0 )
    {
      //Make a list with the elements inside the box
      var rect = selectBox.getMapRectangle();
      var list = [];
      for ( var i = 0 ; i < elementList.length ; i++ )
	if ( overlapPoints( elementList[i], rect ) )
	  list.push( elementList[i] );

      //Toggle
      if ( event.ctrlKey )
      {
	for ( var i = 0 ; i < list.length ; i++ )
	  list[i].toggleSelected();
      }
      //Select only these
      else
      {
	selectElements( false );
	selectElements( true , list );
      }
    }
  }
}

map.prototype.mouseMove = function ( event )
{
  if ( this.mousePan )
  {
    if ( event.clientX <= 5 )
      this.panRightLeft = 2;
    else if ( event.clientX >= window.innerWidth - 5 )
      this.panRightLeft = 1;
    else
      this.panRightLeft = 0;

    if ( event.clientY <= 5 )
      this.panUpDown = 1;
    else if ( event.clientY >= window.innerHeight - 5 )
      this.panUpDown = 2;
    else
      this.panUpDown = 0;
  }
  if ( selectBox.active )
    selectBox.reDraw( event.clientX, event.clientY );
}

map.prototype.wheel = function ( event )
{
    if ( this.followedObj instanceof element ) ///element selected, zoom to element position
    {
      if ( event.detail > 0 )
	this.zoomIn( this.followedObj.getPosition() );
      else
	this.zoomOut( this.followedObj.getPosition() );
    }
    else					/// zoom to mouse position
    {
      var aux = new vector( this.viewBoxWidth, this.viewBoxHeight );
      aux = aux.multiply( ( this.zoomFactor - 1 )/2 );

      var aux2 = new vector ( event.clientX*this.viewBoxWidth/window.innerWidth, event.clientY*this.viewBoxHeight/window.innerHeight );
      aux2 = aux2.multiply( 1 - this.zoomFactor );

      if ( event.detail > 0 )
	this.zoomIn( this.scroll.add( aux ).add( aux2 ) );
      else
	this.zoomOut( this.scroll.minus( aux ).minus( aux2 ) );
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function selectionBox()
{
  this.SVGNode = document.createElementNS( 'http://www.w3.org/2000/svg', 'rect' );
  this.SVGNode.setAttribute( 'id' , 'selectionBox' );
  this.SVGNode.setAttribute( 'style' , 'fill:none;stroke:#008000' );
  this.origX = 0;
  this.origY = 0;
  this.x = 0;
  this.y = 0;
  this.width = 0;
  this.height = 0;
  this.active = false;
}

selectionBox.prototype.setOrig = function ( x, y )
{
  this.origX = x;
  this.origY = y;
  this.SVGNode.setAttribute( 'x' , x );
  this.SVGNode.setAttribute( 'y' , y );
}

selectionBox.prototype.setCorner = function ( x, y )
{
  this.x = x;
  this.y = y;
  this.SVGNode.setAttribute( 'x' , x );
  this.SVGNode.setAttribute( 'y' , y );
}

selectionBox.prototype.setDimensions = function ( width, height )
{
  this.width = width;
  this.height = height;
  this.SVGNode.setAttribute( 'width' , width );
  this.SVGNode.setAttribute( 'height' , height );
}

selectionBox.prototype.beginDraw = function ( x, y )
{
  this.setOrig( x, y );
  this.setDimensions( 0, 0 );
  svgMain.appendChild( this.SVGNode );
  this.active = true;
  document.addEventListener( 'mousemove', scene.mouseMove, false );	//no closure needed here
}

selectionBox.prototype.reDraw = function ( x, y )
{
  if ( x > this.origX )
  {
    this.x = this.origX;
    this.width = x - this.origX;
  }
  else
  {
    this.x = x;
    this.width = this.origX - x;
  }
  if ( y > this.origY )
  {
    this.y = this.origY;
    this.height = y - this.origY;
  }
  else
  {
    this.y = y;
    this.height = this.origY - y;
  }
  this.SVGNode.setAttribute( 'x' , this.x );
  this.SVGNode.setAttribute( 'y' , this.y );
  this.SVGNode.setAttribute( 'width' , this.width );
  this.SVGNode.setAttribute( 'height' , this.height);
}

selectionBox.prototype.unDraw = function ()
{
  if ( this.active )
  {
    this.active = false;
    document.removeEventListener( 'mousemove', scene.mouseMove, false ); //no closure needed here
    svgMain.removeChild( this.SVGNode );
  }
}

selectionBox.prototype.getMapRectangle = function()
{
  var p = scene.fromScreen( new vector ( this.x + this.width/2, this.y + this.height/2 ) );
  var dimensions = scene.fromScreen( new vector ( this.width, this.height ) );//p2.minus( p1 );
  return new rectangle( dimensions.x, dimensions.y, p );
}