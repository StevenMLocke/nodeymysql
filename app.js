//required node module for working with myswl
var sql = require('mysql');

//connection configuration
var config = {};
config.host = 'localhost';
config.user = 'root';
config.connectionLimit = '25';

//pool of sql connections
var pool = sql.createPool(config);

//array to hold person ids
var persons = [];

//init a connection
pool.getConnection(function(error, connection){
    //make a query to db
    var q = connection.query("SELECT DISTINCT person_id FROM stuff.things ORDER BY person_id ASC;");

    //uses streaming, i.e. as soon as a row comes in run the function on it with the row as an argument
    q.on('result', function(r){
        connection.pause();
        
        //r = row person_id is a column name
        id = r.person_id;
        
        //running total milliseconds(just because that is how javascript does, php would use full seconds) per person, resets on each person
        total = 0;
       
        //time #1 var
        aVal = 0;
       
        //time # 2 var
        bVal = 0;
        console.log('total for person: ' + id);
        pool.getConnection(function(err,conn){
            //get all timestamps for a person
            var q2 = conn.query('SELECT `timestamp` FROM stuff.things WHERE person_id like ? ORDER BY `timestamp` ASC;', id);

            //if something goes wrong, say so
            q2.on('error', function(err){
                console.log('nested error' + err.message);
            })
            
            //when a row is receiveded do the function on it
            q2.on('result', function(row){
                if (!aVal){
                    aVal = row.timestamp;
                }else{
                    bVal = aVal;
                    aVal = row.timestamp;
                    total += diff(aVal, bVal);
                }
            });

            q2.on('end', function(){
                conn.pause();
                console.log('total: ' + total + '\n\n');
                totals = {person_id : id , total : total};
                
                //make another connection
                pool.getConnection(function(err, connection3) {
                    
                    //insert person_id and total milliseconds into other table (that was already created and set up)
                    var q3 = connection3.query('INSERT INTO stuff.totals SET ?', totals);

                    //when done with insert close this connection and resume the connection above
                    q3.on('end', function(){    
                        connection3.release();
                        if (error) throw error;
                        conn.resume();
                    });
                });
                
                //when done with insert close this connection and resume the connection above
                conn.release();
                total = 0;
                connection.resume();
            })
        });
    })

    //when done with insert close this connection and exit script
    q.on('end', function(){
        connection.release();
        process.exit();
    })

    if (error){
        console.log('error: ' + error.message);
        connection.release();
    }
});

function addToArr(arr, item,cb){
    arr.push(item);
    cb();
}

///////////////////////
//functions
//////////////////////

function diff(a,b){
    return a- b;
}
function add(a,b){
    return a + b
}