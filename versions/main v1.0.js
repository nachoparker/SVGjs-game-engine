//	TODO
//	====
//	* collision detection
//	* onscreen information
//	* include external SVGs - 'use or image' (no Mozilla support yet!!), coordinating from an upperlevel XHTML document or using AJAX
//	* XML configuration file
//	* resize event

addEventListener( 'load', init, false );

function init()
{
/*    SVGmain = document.getElementById( 'SVGroot' );
    SVGmain.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );

    subject = undefined;
    characters = charList('main');
    scenario = new map( 'background', 1000, 800, 400 );

    document.addEventListener( 'keydown', keyboard, false );
    document.addEventListener( 'keyup', keystop, false );
    document.addEventListener( 'mousedown', mouse, false );
    document.addEventListener('DOMMouseScroll', wheel, false );
    
    fotogramsPerCycle = 10;*/
//     setInterval( 'drawFrame()', 50 );

///MAPA
    SVGmain = document.getElementById( 'SVGroot' );
    SVGmain.setAttribute( 'preserveAspectRatio', 'xMinYMin meet' );

    mapSizeX = SVGmain.getAttribute( 'width' );				
    mapSizeY = SVGmain.getAttribute( 'height' );

    SVGmain.setAttribute( 'width', window.innerWidth );
    SVGmain.setAttribute( 'height', window.innerHeight );
    VBHeight = 400;
    VBWidth = VBHeight*window.innerWidth/window.innerHeight;
    SVGmain.setAttribute( 'viewBox', '1000 800 ' + VBWidth +' '+ VBHeight ); 		///zoom inicial

    var params = SVGmain.getAttribute( 'viewBox' ).split(' ');
    scroll = new point ( params[0]-0, params[1]-0 ) ;
    sizeX = params[2]-0;
    sizeY = params[3]-0;

///GENERAL
    increment = sizeX/200;
    zoom = 0.95;
    fotogramsPerCycle = 10;
    maxZoom = 35;
    zoomState = 'none';

    subject = undefined;
    characters = charList('main');

    document.addEventListener( 'keydown', keyboard, false );
    document.addEventListener( 'keyup', keystop, false );
    document.addEventListener( 'mousedown', mouse, false );
    setInterval( 'drawFrame()', 50 );
        document.addEventListener('DOMMouseScroll', wheel, false );
}

function drawFrame()
{
if ( subject.state == 'mousemoving' )
subject.moveTo();
else
    doMovements();
    doAnimations();
    doZoom();
}

/*function map( id, viewBoxCoords, viewBoxSizeX, viewBoxSizeY )		//TODO map.viewBox()
{
    this.id = id;
    this.SVGNode = document.getElementById( id );
  
    this.mapSizeX = SVGNode.getAttribute( 'width'  ); //TODO probar cuando no existe atributo
    this.mapSizeY = SVGNode.getAttribute( 'height' );

    this.SVGNode.setAttribute( 'width', window.innerWidth );
    this.SVGNode.setAttribute( 'height', window.innerHeight );

    
    if ( viewBoxCoords && viewBoxSizeX  )
    {
      this.viewBoxWidth = viewBoxSizeX;
      if ( !viewBoxSizeY )
	  this.viewBoxHeight = viewBoxWidth*window.innerHeight/window.innerWidth;
      else
	  this.viewBoxHeight = viewBoxSizeY;
      this.scroll = new point( viewBoxCoords.x, viewBoxCoords.y );// scroll=viewBoxCoords;??
    }
    else
    {
        var params = SVGNode.getAttribute( 'viewBox' ).split(' '); //TODO probar cuando no existe atributo
	this.scroll = new point ( params[0]-0, params[1]-0 ) ;
	this.sizeX = params[2]-0;
	this.sizeY = params[3]-0;
    }
    this.SVGNode.setAttribute( 'viewBox', this.scroll.x +' '+ this.scroll.y +' '+ this.sizeX +' '+ this.sizeY ); //TODO probar cuando no existe atributo

//////////////////
    
    this.increment = this.sizeX/200;
    this.zoom = 0.95;				///TODO to the prototype
    if ( subject )
      this.maxZoom = subject.size;
    else
      this.maxZoom = 10;
    this.zoomState = 'none';
}
*/
function character( id, coordinates )                    /// Character constructor, from SVG element with id 'id' in SVG DOM tree.
{
    this.id = id;
    this.SVGNode = document.getElementById( id );
    this.group = document.getElementById( id +'group' );
    this.type = this.SVGNode.getAttribute( 'character' );
    this.lArm = document.getElementById( id + 'leftarm' );
    this.rArm = document.getElementById( id + 'rightarm' );
    this.lLeg = document.getElementById( id + 'leftleg' );
    this.rLeg = document.getElementById( id + 'rightleg' );
    this.head   = document.getElementById( id + 'head' );
    
    this.state = 'none';
    this.animation = 'none';
    this.moveDir = 'none';
    this.orientation = 'left';
    this.Height = this.SVGNode.getAttribute( 'height' )-0;
    this.Width = this.Height*0.7;
    this.pos = new point( coordinates.x - this.Width/2, coordinates.y - this.Height/2 );
    this.SVGNode.setAttribute( 'x', this.pos.x );
    this.SVGNode.setAttribute( 'y', this.pos.y );
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

    this.lArmAxis = new point( this.lArm.getAttribute( 'lArmAxisX' )-0 , this.lArm.getAttribute( 'lArmAxisY' )-0 );
    this.rArmAxis = new point( this.rArm.getAttribute( 'rArmAxisX' )-0 , this.rArm.getAttribute( 'rArmAxisY' )-0 );
    this.headAxis = new point( this.head.getAttribute( 'headX' )-0 , this.head.getAttribute( 'headY' )-0 );
    
    this.headRange = 2;
    this.StretchRange = 0.02;

this.dest= new point(this.pos.x, this.pos.y);//this.pos;
}

character.prototype.setX = function ( posX )
{
    this.pos.x = posX;
    this.SVGNode.setAttribute( 'x', posX );
}

character.prototype.setY = function ( posY )
{
    this.pos.y = posY;
    this.SVGNode.setAttribute( 'y', posY );
}

//character.prototype.setPoint

character.prototype.setState = function ( newState, newAnimation )
{
    this.state = newState;
    if ( newAnimation )
      this.animation = animation;
    else					//TODO make more generic
    {
	switch ( newState )
	{
	  case 'moving' 	: this.animation = 'moving';	break;
	  case 'mousemoving' 	: this.animation = 'moving';	break;
	  default		: this.animation = 'standing';
	}
    }
}

character.prototype.animate = function ( animate )    ///Performs 'animation', or the animation corresponding to the current state if no parameters
{					//TODO change 'state' for 'animation'
    if ( animate )
	this.animation = animate;
    if ( this.animation == 'moving' )
    {
	if ( this.lAngleArm <= -115 )
	    this.lArmFlag = false;
	if ( this.lArmFlag )
	    this.lAngleArm -= 115/fotogramsPerCycle;
	else 
	  this.lAngleArm += 115/fotogramsPerCycle;
	if ( this.lAngleArm >= 0 )
	    this.lArmFlag = true;
    //////////////////////////////////////////
	if ( this.rAngleArm >= 120 )
	    this.rArmFlag = false;
	if ( this.rArmFlag )
	    this.rAngleArm += 120/fotogramsPerCycle;
	else 
	  this.rAngleArm -= 120/fotogramsPerCycle;
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
    if ( this.animation == 'standing' )
    {
	if ( this.headAngle > this.headRange )
	  this.headFlag = false;
	if ( this.headFlag )
	  this.headAngle += 5*this.headRange/fotogramsPerCycle;
	else
	  this.headAngle -= 5*this.headRange/fotogramsPerCycle;
	if ( this.headAngle < -this.headRange )
	  this.headFlag = true;

	this.head.setAttribute( 'transform', 'rotate( ' + this.headAngle + ' ,'+ this.headAxis.x + ', ' + this.headAxis.y +')' );
    }
}

character.prototype.move = function ( direction )	///Performs position change each frame in the given 'direction', or depending on the current movement state
{
 
    if ( direction && ( direction == 'up' || direction == 'down'|| direction == 'left' || direction == 'right' ) )
	this.moveDir = direction;
    {
	if ( this.moveDir == 'up' )
		this.setY ( this.pos.y - increment );
	if ( this.moveDir == 'down' )
		this.setY ( this.pos.y + increment );
	if ( this.moveDir == 'right' )
	{
	    if ( this.orientation == 'left' )
	    {
		this.group.setAttribute( 'transform', 'matrix(-1,0,0,1,140,0)' );
		subject.orientation = 'right';
	    }
	    else
		this.setX ( this.pos.x + increment );
	}
	if ( this.moveDir == 'left' )
	{
	    if ( subject.orientation == 'right' )
	    {
		subject.group.setAttribute( 'transform', '' );
		subject.orientation = 'left';
	    }
	    else
		this.setX ( this.pos.x - increment );
	}
    }
}

character.prototype.moveTo = function ( /*destX, destY*/ )	///Sets the direction movement and moving state until reaching (destX,destY)
{
    this.setState( 'mousemoving' );
    var distX = this.dest.x - this.Width/2 - this.pos.x;
    var distY = this.dest.y - this.Height/2 - this.pos.y;

    if ( distX > increment )
      this.move( 'right' );
    else if ( distX < (-1)*increment )
      this.move( 'left' );
    else if ( distY > increment )
      this.move( 'down' );
    else if ( distY < (-1)*increment )
      this.move( 'up' );
    else
      this.setState( 'standing' );
}

function charList( mainSubject )			/// Sets 'mainSubject' or the first 'main' character as 'subject', and returns a list with ALL OTHER characters
{
    var mainSubject = mainSubject || 'main';
    var SVGlist = document.getElementsByTagName( 'svg' );
    var chNodeList = [];
    var chList = [];

    for ( var i = 0 ; i < SVGlist.length ; i++ )
    {
	var auxChr = SVGlist[i].getAttribute( 'character' )  ;
	if ( auxChr )
        {
	    if ( subject && auxChr == mainSubject )
	      chNodeList.push( SVGlist[i] );
	    if ( !subject && auxChr == mainSubject )
	      subject = new character( SVGlist[i].getAttribute( 'id' ), new point( SVGlist[i].getAttribute( 'x' )-0, SVGlist[i].getAttribute( 'y' )-0 ) );
	}
    }

    for ( var i = 0 ; i < chNodeList.length ; i++ )
         chList[i] = new character( chNodeList[i].getAttribute( 'id' ), new point( chNodeList[i].getAttribute( 'x' )-0, chNodeList[i].getAttribute( 'y' )-0 ) );

    if ( !subject )
	alert( "ERROR: no personaje a controlar. Se requiere al menos un personaje con el atributo character='main' " );

    return chList;
}

function doAnimations( objList )		// Animate the objects in the list ('objList' is an array of strings with the identifiers). Animate all if no list
{
    if ( !objList )
    {
	subject.animate();
	for ( var i = 0 ; i < characters.length ; i++ )
	  characters[i].animate();
    }
    else
    {
	for ( var i = 0 ; i < objList.length ; i++ )
	  if ( objList[i] == subject.id )
	  {
	    subject.animate();
	    objList.splice( i , 1 );
	    i = objList.length;
	  }
	for ( var i = 0 ; i < characters.length ; i++ )
	  for ( var j = 0 ; j < objList.length ; j++ )
	    if ( objList[j] == characters[i].id )
	    {
	      characters[i].animate();
	      objList.splice( j , 1 );
	      j = objList.length;
	    }
    }
}

function doMovements( objList )		// Move the objects in the list ('objList' is an array of strings with the identifiers). Move all if no list
{
    if ( !objList )
    {
	if ( subject.state == 'moving')
	  subject.move();
	for ( var i = 0 ; i < characters.length ; i++ )
	  if ( characters[i].state == 'moving')
	    characters[i].move();
    }
    else
    {
	for ( var i = 0 ; i < objList.length ; i++ )
	  if ( objList[i] == subject.id )
	  {
	    if ( subject.state == 'moving' )
		subject.move('upd');
// 	    objList.splice( i , 1 );
	    i = objList.length;
	  }
	for ( var i = 0 ; i < characters.length ; i++ )
	  for ( var j = 0 ; j < objList.length ; j++ )
	    if ( objList[j] == characters[i].id )
	    {
	      if ( characters[i].state == 'moving' )
		  characters[i].move();
// 	      objList.splice( j , 1 );
	      j = objList.length;
	    }
    }
}

function doZoom( newX, newY, newSizeX, newSizeY )///zoom/scroll to this position if parameters are input, and/or update zoom/scroll in moving/scrolling/zooming states
{
    if( newX && newY && newSizeX && newSizeY )
    {
      scroll.x = newX;
      scroll.y = newY;
      sizeX = newSizeX;
      sizeY = newSizeY;
    }
    if ( zoomState == 'down' )
      scroll.y += increment*sizeY/80;
    if ( zoomState == 'up' )
      scroll.y -= increment*sizeY/80;
    if ( zoomState == 'right' )
      scroll.x += increment*sizeX/80;
    if ( zoomState == 'left' )
      scroll.x -= increment*sizeX/80;

    if ( zoomState == 'zoomIn'  && ( sizeX >= maxZoom || sizeY >= maxZoom ) )
    {
	    scroll.x += sizeX*(1-zoom)/2;
	    scroll.y += sizeY*(1-zoom)/2;
	    sizeX *= zoom;
	    sizeY *= zoom;
    }
    if ( zoomState == 'zoomOut'  && ( sizeX <= mapSizeX || sizeY <= mapSizeY ) )
    {
	    if ( scroll.x < mapSizeX - sizeX  )
	      scroll.x -= sizeX*(1-zoom)/2;
	    else
	      scroll.x -= sizeX*(1-zoom);
	    if ( scroll.y < mapSizeY - sizeY  )
	      scroll.y -= sizeY*(1-zoom)/2;
	    else
	      scroll.y -= sizeY*(1-zoom);
		    
	    sizeX /= zoom;
	    sizeY /= zoom; 
    }
    ///Boundary checks

    if ( scroll.x + sizeX >= mapSizeY )
      scroll.x = mapSizeX - sizeX;
    if ( scroll.y + sizeY >= mapSizeY )
      scroll.y = mapSizeY - sizeY;	

    if ( scroll.x < 0 )
      scroll.x = 0;
    if ( scroll.y < 0 )
      scroll.y = 0;

    ///Pan margins when walking
    if ( subject.state == 'moving' )
    {
	if ( subject.pos.x - (sizeX-subject.Width)/4.0 < scroll.x )
	  scroll.x = subject.pos.x - (sizeX-subject.Width)/4.0;

	if ( subject.pos.x + subject.Width + (sizeX-subject.Width)/4.0 > scroll.x + sizeX )
	  scroll.x = subject.pos.x + subject.Width + (sizeX-subject.Width)/4.0 - sizeX;

	if ( subject.pos.y + subject.Height + (sizeY-subject.Height)/4.0 > scroll.y + sizeY )
	  scroll.y = subject.pos.y + subject.Height + (sizeY-subject.Height)/4.0 - sizeY;

	if ( subject.pos.y - (sizeY-subject.Height)/4.0 < scroll.y )
	  scroll.y = subject.pos.y - (sizeY-subject.Height)/4.0;
    }
    SVGmain.setAttribute( 'viewBox', scroll.x +' '+ scroll.y +' '+ sizeX +','+ sizeY );
}

function keystop( event )
{
    if ( event.keyCode == 87 || event.keyCode == 83 || event.keyCode == 68 || event.keyCode == 65 )
      subject.setState ( 'standing');
    if ( event.keyCode == 33 || event.keyCode == 34 || event.keyCode == 37  || event.keyCode == 38  || event.keyCode == 39  || event.keyCode == 40  )
      zoomState = 'none';
    document.addEventListener( 'keydown', keyboard, false );
}

function keyboard( event )
{
      document.removeEventListener( 'keydown', keyboard, false );

/******************ZOOMING***********************/

      zoomState = 'none';
      if ( event.keyCode == 40 && scroll.y <= mapSizeY ) ///down
	  zoomState = 'down';
      if ( event.keyCode == 38 && scroll.y >= 0	     		) ///up
	  zoomState = 'up';
      if ( event.keyCode == 39 && scroll.x <= mapSizeX ) 	  ///right
	  zoomState = 'right';
      if ( event.keyCode == 37 && scroll.x >= 0	   		) ///left
	  zoomState = 'left';

      if ( event.keyCode == 34 )		 ///PG_DOWN ZOOM IN
	zoomState = 'zoomIn';
      if ( event.keyCode == 33 )		 ///PG_UP ZOOM OUT
	zoomState = 'zoomOut';

/****************MOVING*************************/
      
      if ( event.keyCode == 87 ) ///'w' UP
      {
	subject.moveDir = 'up';
	subject.setState ( 'moving' );
      }
      if ( event.keyCode == 83 ) ///'s' DOWN
      {
	subject.moveDir = 'down';
	subject.setState ( 'moving' );
      }
      if ( event.keyCode == 68 ) ///'d' RIGHT
      {
	subject.moveDir = 'right';
	subject.setState ( 'moving' );
      }
      if ( event.keyCode == 65 ) ///'a' LEFT
      {
	subject.moveDir = 'left';
	subject.setState ( 'moving' );
      }

/*************OTHER******************************/

      if ( event.keyCode == 32 )		 ///SPACE
	  doZoom( subject.pos.x-25, subject.pos.y-5, 50*sizeX/sizeY, 50 ); //TODO toggle 'follow character' mode (map/camera property)
}

function mouse( event )   //TODO different actions for different buttons
{
     subject.dest.x =  sizeX*event.clientX/window.innerWidth + scroll.x ;
     subject.dest.y =  sizeY*event.clientY/window.innerHeight + scroll.y ;
//       point = /*map.*/toMapCoordinates( event.ClientX, event.ClientY );//alert(point.x);
      subject.animation = 'moving';
      subject.moveTo( sizeX*event.clientX/window.innerWidth + scroll.x, sizeY*event.clientY/window.innerHeight + scroll.y );
}

function wheel( event ) //TODO centered zoom , and mouse scroll
{
    if ( event.detail > 0 )
    {
      	    scroll.x += sizeX*(1-zoom)/2;
	    scroll.y += sizeY*(1-zoom)/2;
	    sizeX *= zoom;
	    sizeY *= zoom;
    }    
    else
{
	    if ( scroll.x < mapSizeX - sizeX  )
	      scroll.x -= sizeX*(1-zoom)/2;
	    else
	      scroll.x -= sizeX*(1-zoom);
	    if ( scroll.y < mapSizeY - sizeY  )
	      scroll.y -= sizeY*(1-zoom)/2;
	    else
	      scroll.y -= sizeY*(1-zoom);
		    
	    sizeX /= zoom;
	    sizeY /= zoom; 
    }
}

function point( x, y )
{
    if ( x )
      this.x = x;
    else
      this.x = 0;
    if ( y )
      this.y = y;
    else
      this.y = 0;
}

function /*prototype.*/movement( destPoint )
{
    this.dest = destPoint;
}

function /*map.*/toMapCoordinates( x, y )
{
    return {"x":sizeX*x/window.innerWidth + scroll.x , "y":sizeY*y/window.innerHeight + scroll.y };
}