/* eslint-disable no-console,func-names,react/no-multi-comp */
const React = require('react');
const ReactDOM = require('react-dom');
const Table = require('rc-table');
import Animate from 'rc-animate';
import test from './test.css';

require('rc-table/assets/index.less');
require('rc-table/assets/animation.less');

class Demo extends React.Component {
  constructor(props) {
    super(props);
    this.columns = [
      {title: 'title1', dataIndex: 'a', key: 'a', width: 100},
      {title: 'title2', dataIndex: 'b', key: 'b', width: 100},
      {title: 'title3', dataIndex: 'c', key: 'c', width: 200},
      //{title: 'title4', dataIndex: 'd', key: 'd', width: 200},
      //{title: 'title5', dataIndex: 'e', key: 'e', width: 200},
      //{title: 'title6', dataIndex: 'f', key: 'f', width: 200},
      //{title: 'title7', dataIndex: 'g', key: 'g', width: 200},
      //{title: 'title8', dataIndex: 'h', key: 'h', width: 200},
      //{title: 'title9', dataIndex: 'i', key: 'i', width: 200},
      //{title: 'title10', dataIndex: 'j', key: 'j', width: 200},
      //{title: 'title11', dataIndex: 'k', key: 'k', width: 200},
      //{title: 'title12', dataIndex: 'l', key: 'l', width: 200},
      //{title: 'title13', dataIndex: 'm', key: 'm', width: 200},
      //{title: 'title14', dataIndex: 'n', key: 'n', width: 200},
      //{title: 'title15', dataIndex: 'o', key: 'o', width: 200},
      //{title: 'title16', dataIndex: 'p', key: 'p', width: 200},
      //{title: 'title17', dataIndex: 'q', key: 'q', width: 200},
      //{title: 'title18', dataIndex: 'r', key: 'r', width: 200},
      //{title: 'title19', dataIndex: 's', key: 's', width: 200},
      {
        title: 'title20', dataIndex: 't', key: 't', render: (text, record) =>
        <a onClick={e => this.onDelete(record.key, e)} href="#">Delete</a>,
      },
    ];
    this.state = {
      data: [
        {
          a: 'a',
          b: 'b',
          c: 'c',
          d: 'd',
          e: 'e',
          f: 'f',
          g: 'g',
          h: 'h',
          children:[
            { a: 'a',
              b: 'b',
              c: 'c',
            key:'d'}
          ],
          //i: '123',
          //j: '123',
          //k: '123',
          //l: '123',
          //m: '123',
          //n: '123',
          //o: '123',
          //p: '123',
          //q: '123',
          //r: '123',
          //s: '123',
          //t: '213',
          key: Date.now()
        }
      ],
    };
  }

  onDelete(key, e) {
    console.log('Delete', key);
    e.preventDefault();
    const data = this.state.data.filter(item => item.key !== key);
    this.setState({data});
  }

  onAdd() {
    const data = [...this.state.data];
    data.push({
      a: 'new data',
      b: 'new data',
      c: 'new data',
      key: Date.now(),
    });
    this.setState({data});
  }

  getBodyWrapper(body) {
    return (
      <Animate transitionName="move" component="tbody" className={body.props.className}>
        {body.props.children}
      </Animate>
    );
  }

  render() {
    return (
      <div style={{ margin: 20 }}>
        <h2>Table row with animation</h2>
        <button onClick={() => this.onAdd()}>添加</button>
        <Table
          title={data=>{
              return '表头'
          }}
          needIndentSpaced={true}
          prefixCls={'rc-table test-wrapper'}
          useFixedHeader={true}
          columns={this.columns}
          data={this.state.data}
        />
      </div>
    );
  }
}
ReactDOM.render(
  <Demo />,
  document.getElementById('__react-content')
);
